import type { Request, Response } from 'express';
import { and, eq } from 'drizzle-orm';
import { db } from '../../../../../db/client.js';
import { visits, intakeSessions } from '../../../../../db/schema.js';
import { requireClinician, logErr } from '../../../../../lib/dispatch.js';
import { scheduleCheckin } from '../../../../../lib/companion.js';
import { payoutCentsFor } from '../../../../../lib/stripe.js';
import { audit } from '../../../../../lib/audit.js';

export default async function handler(req: Request, res: Response) {
  try {
    const ctx = await requireClinician(req, res);
    if (!ctx) return;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid visit id' });

    const [done] = await db
      .update(visits)
      .set({ status: 'completed', completedAt: new Date() })
      .where(and(eq(visits.id, id), eq(visits.status, 'accepted'), eq(visits.clinicianUserId, ctx.userId)))
      .returning({ id: visits.id, intakeSessionId: visits.intakeSessionId, patientUserId: visits.patientUserId, acuity: visits.acuity, paymentStatus: visits.paymentStatus });
    if (!done) return res.status(404).json({ error: 'No active visit to complete' });

    // Stamp the intake with who saw the patient so the portal timeline shows it.
    const name = ctx.profile.displayName?.trim();
    if (name) {
      await db.update(intakeSessions).set({ providerName: name }).where(eq(intakeSessions.id, done.intakeSessionId));
    }
    // Ledger: a captured (paid) visit earns the clinician the configured payout.
    const payout = payoutCentsFor(done.acuity);
    if (payout && done.paymentStatus === 'captured') {
      await db.update(visits).set({ payoutCents: payout, payoutStatus: 'owed' }).where(eq(visits.id, done.id));
    }

    // Ace checks in 48h after every completed visit.
    try {
      await scheduleCheckin(done.intakeSessionId, done.patientUserId, 'post_visit');
    } catch (err) {
      logErr('dispatch.complete.schedule_checkin_failed', err);
    }

    audit(req, { action: 'visit.complete', actorUserId: ctx.userId, actorRole: ctx.isAdmin ? 'admin' : 'provider', resourceType: 'visit', resourceId: id, patientUserId: done.patientUserId, meta: { acuity: done.acuity, payoutBooked: !!(payout && done.paymentStatus === 'captured') } });
    res.json({ ok: true });
  } catch (error) {
    logErr('dispatch.complete.error', error);
    res.status(500).json({ error: 'Failed to complete visit' });
  }
}
