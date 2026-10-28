import type { Request, Response } from 'express';
import { and, eq } from 'drizzle-orm';
import { db } from '../../../../../db/client.js';
import { visits, patientProfiles } from '../../../../../db/schema.js';
import { requireClinician, licensesOf, scopeCovers, logErr } from '../../../../../lib/dispatch.js';
import { sendSms, acceptedText, toE164, smsAvailable } from '../../../../../lib/sms.js';
import { capturePayment } from '../../../../../lib/stripe.js';
import { audit } from '../../../../../lib/audit.js';

/** First clinician to accept wins. The UPDATE's WHERE status='queued' is the lock. */
export default async function handler(req: Request, res: Response) {
  try {
    const ctx = await requireClinician(req, res);
    if (!ctx) return;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid visit id' });
    if (!ctx.profile.online) return res.status(409).json({ error: 'Go online to accept visits' });

    const [visit] = await db.select().from(visits).where(eq(visits.id, id)).limit(1);
    if (!visit) return res.status(404).json({ error: 'Visit not found' });

    // Licensure and scope are re-checked server-side — never trust the client's filtered view.
    if (!licensesOf(ctx.profile).includes(visit.patientState)) {
      return res.status(403).json({ error: `Not licensed in ${visit.patientState}` });
    }
    if (!scopeCovers(ctx.profile.maxAcuity, visit.acuity)) {
      return res.status(403).json({ error: 'Outside your accepted scope' });
    }

    const [accepted] = await db
      .update(visits)
      .set({ status: 'accepted', clinicianUserId: ctx.userId, acceptedAt: new Date() })
      .where(and(eq(visits.id, id), eq(visits.status, 'queued')))
      .returning({ id: visits.id, paymentStatus: visits.paymentStatus, pi: visits.stripePaymentIntent });

    if (!accepted) return res.status(409).json({ error: 'Another clinician already accepted this visit' });

    // Paid visit: capture the hold now that a clinician has committed. Decided from the
    // row the UPDATE returned, not the earlier read — the webhook can flip
    // pending_payment → authorized in between. A visit re-queued after a release is
    // already captured and is not charged again. A capture failure is logged, not
    // fatal — the visit is already accepted and care comes first.
    if (accepted.paymentStatus === 'authorized' && accepted.pi) {
      try {
        await capturePayment(accepted.pi);
        await db.update(visits).set({ paymentStatus: 'captured' }).where(eq(visits.id, id));
      } catch (err) {
        logErr('dispatch.accept.capture_failed', err);
      }
    }

    audit(req, { action: 'visit.accept', actorUserId: ctx.userId, actorRole: ctx.isAdmin ? 'admin' : 'provider', resourceType: 'visit', resourceId: id, patientUserId: visit.patientUserId, meta: { acuity: visit.acuity, state: visit.patientState } });
    res.json({ ok: true, id: accepted.id });

    // Tell the patient who is calling. Fire-and-forget, PHI-free.
    if (smsAvailable()) {
      void (async () => {
        try {
          const [p] = await db.select({ phone: patientProfiles.phone }).from(patientProfiles).where(eq(patientProfiles.userId, visit.patientUserId)).limit(1);
          const to = toE164(p?.phone);
          if (to) await sendSms(to, acceptedText(ctx.profile.displayName, ctx.profile.credential));
        } catch (err) {
          logErr('dispatch.accept.notify.error', err);
        }
      })();
    }
  } catch (error) {
    logErr('dispatch.accept.error', error);
    res.status(500).json({ error: 'Failed to accept visit' });
  }
}
