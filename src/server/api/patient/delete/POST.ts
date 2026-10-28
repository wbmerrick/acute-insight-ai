import type { Request, Response } from 'express';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../../../db/client.js';
import { user, visits } from '../../../db/schema.js';
import { requirePatient, logErr } from '../../../lib/dispatch.js';
import { audit } from '../../../lib/audit.js';
import { releasePayment } from '../../../lib/stripe.js';

/**
 * Delete my account. Body: { confirmEmail }. Refused while a visit is accepted
 * (a clinician is mid-care); queued requests are cancelled and any card hold
 * released first. Cascades remove profile, intakes, visits, check-ins, sessions.
 * Audit rows are kept (append-only) with the patient id as a reference.
 */
export default async function handler(req: Request, res: Response) {
  try {
    const userId = await requirePatient(req, res);
    if (!userId) return;
    const [u] = await db.select({ email: user.email, role: user.role, isAdmin: user.isAdmin }).from(user).where(eq(user.id, userId)).limit(1);
    if (!u) return res.status(404).json({ error: 'Account not found' });
    const { confirmEmail } = (req.body ?? {}) as { confirmEmail?: string };
    if (!confirmEmail || confirmEmail.trim().toLowerCase() !== u.email.toLowerCase()) {
      return res.status(400).json({ error: 'Type your account email exactly to confirm' });
    }
    if (u.role === 'provider' || u.isAdmin) {
      return res.status(409).json({ error: 'Clinician and admin accounts are removed by an administrator, not self-service' });
    }

    const [active] = await db.select({ id: visits.id }).from(visits).where(and(eq(visits.patientUserId, userId), eq(visits.status, 'accepted'))).limit(1);
    if (active) return res.status(409).json({ error: 'A clinician has accepted a visit with you. Finish or cancel that visit first.' });

    const open = await db
      .update(visits)
      .set({ status: 'cancelled' })
      .where(and(eq(visits.patientUserId, userId), inArray(visits.status, ['queued', 'pending_payment'])))
      .returning({ id: visits.id, paymentStatus: visits.paymentStatus, pi: visits.stripePaymentIntent });
    for (const v of open) {
      if (v.paymentStatus === 'authorized' && v.pi) {
        try { await releasePayment(v.pi); } catch (err) { logErr('patient.delete.release_failed', err); }
      }
    }

    audit(req, { action: 'patient.delete', actorUserId: userId, actorRole: 'patient', resourceType: 'user', resourceId: userId, patientUserId: userId, meta: { cancelledRequests: open.length } });
    await db.delete(user).where(eq(user.id, userId)); // cascades: sessions, accounts, profile, intakes, visits, checkins, two_factor
    res.clearCookie('better-auth.session_token', { path: '/' });
    res.json({ ok: true });
  } catch (error) {
    logErr('patient.delete.error', error);
    res.status(500).json({ error: 'Failed to delete your account' });
  }
}
