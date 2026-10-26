import type { Request, Response } from 'express';
import { and, eq } from 'drizzle-orm';
import { db } from '../../../db/client.js';
import { visits, intakeSessions, patientProfiles, clinicianProfiles } from '../../../db/schema.js';
import { requirePatient, isUsState, DISPATCHABLE, logErr } from '../../../lib/dispatch.js';
import type { ClinicalBrief, Acuity } from '../../../../lib/clinical-brief.js';
import { sendSms, newVisitText, shouldThrottle, smsAvailable } from '../../../lib/sms.js';
import { stripeConfigured, priceCentsFor, createVisitCheckout } from '../../../lib/stripe.js';
import { audit } from '../../../lib/audit.js';
import { ACUITY_LABEL } from '../../../../lib/clinical-brief.js';
import { user as userTable } from '../../../db/schema.js';

const CLINICIAN_TEXT_WINDOW_MS = 10 * 60 * 1000;

/**
 * Patient requests a clinician for a completed intake — the "request a ride".
 * Body: { intakeId, state, phone? }. Emergency briefs are refused: that path is 911.
 */
export default async function handler(req: Request, res: Response) {
  try {
    const userId = await requirePatient(req, res);
    if (!userId) return;

    const { intakeId, state, phone } = (req.body ?? {}) as { intakeId?: unknown; state?: unknown; phone?: unknown };
    const id = Number(intakeId);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'intakeId required' });
    if (!isUsState(state)) return res.status(400).json({ error: 'A valid US state is required' });
    const st = state.toUpperCase();

    const [intake] = await db
      .select({ id: intakeSessions.id, status: intakeSessions.status, chiefComplaint: intakeSessions.chiefComplaint, brief: intakeSessions.aiBrief })
      .from(intakeSessions)
      .where(and(eq(intakeSessions.id, id), eq(intakeSessions.userId, userId)))
      .limit(1);
    if (!intake) return res.status(404).json({ error: 'Intake not found' });
    if (intake.status !== 'complete') return res.status(409).json({ error: 'Finish the intake first' });

    const brief = intake.brief as ClinicalBrief | null;
    const acuity = brief?.disposition?.level as Acuity | undefined;
    if (!acuity || !DISPATCHABLE.includes(acuity)) {
      // Emergency (or no brief) — refuse to queue. The UI already shows the 911 path.
      return res.status(409).json({ error: 'This intake needs emergency care, not a queued visit. Call 911.' });
    }

    // Remember where the patient is (and how to reach them) for next time.
    const profilePatch: Partial<typeof patientProfiles.$inferInsert> = { state: st };
    if (typeof phone === 'string' && phone.trim()) profilePatch.phone = phone.trim().slice(0, 32);
    const [existing] = await db.select({ id: patientProfiles.id }).from(patientProfiles).where(eq(patientProfiles.userId, userId)).limit(1);
    if (existing) await db.update(patientProfiles).set(profilePatch).where(eq(patientProfiles.userId, userId));
    else await db.insert(patientProfiles).values({ userId, ...profilePatch });

    const base = process.env.PUBLIC_BASE_URL ?? `${req.protocol}://${req.hostname}`;
    const price = stripeConfigured() ? priceCentsFor(acuity) : null;

    // One request per intake — re-requesting returns the existing visit (or re-opens checkout if unpaid).
    const [prior] = await db
      .select({ id: visits.id, status: visits.status, checkout: visits.stripeCheckoutId, amount: visits.amountCents })
      .from(visits)
      .where(eq(visits.intakeSessionId, id))
      .limit(1);
    if (prior) {
      if (prior.status === 'pending_payment' && price) {
        const checkout = await checkoutFor(prior.id, price, acuity, userId, base);
        return res.json({ ok: true, visitId: prior.id, status: prior.status, checkoutUrl: checkout.url, amountCents: price });
      }
      return res.json({ ok: true, visitId: prior.id, status: prior.status });
    }

    if (price) {
      // Paid path: create the visit unpaid, send the patient to Checkout; the webhook queues it.
      const [created] = await db
        .insert(visits)
        .values({ intakeSessionId: id, patientUserId: userId, acuity, patientState: st, chiefComplaint: intake.chiefComplaint, status: 'pending_payment', paymentStatus: 'pending', amountCents: price })
        .returning({ id: visits.id });
      const checkout = await checkoutFor(created.id, price, acuity, userId, base);
      audit(req, { action: 'visit.request', actorUserId: userId, actorRole: 'patient', resourceType: 'visit', resourceId: created.id, patientUserId: userId, meta: { acuity, state: st, paid: true } });
      return res.json({ ok: true, visitId: created.id, status: 'pending_payment', checkoutUrl: checkout.url, amountCents: price });
    }

    // Free path (no Stripe / no price for this acuity): queue immediately.
    const [created] = await db
      .insert(visits)
      .values({ intakeSessionId: id, patientUserId: userId, acuity, patientState: st, chiefComplaint: intake.chiefComplaint })
      .returning({ id: visits.id });

    audit(req, { action: 'visit.request', actorUserId: userId, actorRole: 'patient', resourceType: 'visit', resourceId: created.id, patientUserId: userId, meta: { acuity, state: st, paid: false } });
    res.json({ ok: true, visitId: created.id, status: 'queued' });

    // Fire-and-forget: text every online, opted-in clinician licensed in this state.
    void notifyClinicians(acuity, st, base);
  } catch (error) {
    logErr('dispatch.request.error', error);
    res.status(500).json({ error: 'Failed to request a clinician' });
  }
}

async function checkoutFor(visitId: number, amountCents: number, acuity: Acuity, userId: string, base: string) {
  const [u] = await db.select({ email: userTable.email }).from(userTable).where(eq(userTable.id, userId)).limit(1);
  const checkout = await createVisitCheckout({
    visitId,
    amountCents,
    acuityLabel: ACUITY_LABEL[acuity],
    customerEmail: u?.email ?? '',
    successUrl: `${base}/portal?visit=${visitId}&paid=1`,
    cancelUrl: `${base}/portal?visit=${visitId}&cancelled=1`,
  });
  await db.update(visits).set({ stripeCheckoutId: checkout.id, stripePaymentIntent: checkout.payment_intent ?? undefined }).where(eq(visits.id, visitId));
  return checkout;
}

export async function notifyClinicians(acuity: string, state: string, base: string) {
  if (!smsAvailable()) return;
  try {
    const online = await db
      .select({ userId: clinicianProfiles.userId, phone: clinicianProfiles.phone, licenses: clinicianProfiles.stateLicenses, notify: clinicianProfiles.notifySms })
      .from(clinicianProfiles)
      .where(eq(clinicianProfiles.online, true));
    const text = newVisitText(acuity, state, base);
    await Promise.all(
      online
        .filter((c) => c.phone && c.notify !== false && Array.isArray(c.licenses) && c.licenses.includes(state))
        .filter((c) => !shouldThrottle(`clin:${c.userId}`, CLINICIAN_TEXT_WINDOW_MS))
        .map((c) => sendSms(c.phone!, text)),
    );
  } catch (err) {
    logErr('dispatch.notify.error', err);
  }
}
