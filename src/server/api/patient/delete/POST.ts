import type { Request, Response } from 'express';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../../../db/client.js';
import { user, visits, session as sessionTable, account as accountTable, twoFactor, patientProfiles } from '../../../db/schema.js';
import { requirePatient, logErr } from '../../../lib/dispatch.js';
import { audit } from '../../../lib/audit.js';
import { requireRecentAuth } from '../../../lib/reauth.js';
import { settleCancelledVisit } from '../../../lib/stripe.js';

/**
 * ACCOUNT_DELETE_MODE
 *   delete      (default) — remove the user; everything cascades away.
 *   deidentify  — remove identity and access (name, email, phone, DOB, sessions, MFA) but keep the
 *                 clinical record (intakes, briefs, visits, check-ins) under a tombstone user, for
 *                 jurisdictions where the practice must retain medical records after the patient leaves.
 *
 * Delete my account. Body: { confirmEmail }. Refused while a visit is accepted
 * (a clinician is mid-care); queued requests are cancelled and any card hold
 * released first. Cascades remove profile, intakes, visits, check-ins, sessions.
 * Audit rows are kept (append-only) with the patient id as a reference.
 *
 * Two guarantees beyond the mode:
 *  - The "no accepted visit" check and the removal run in one transaction with the
 *    user's visit rows locked, so a clinician's accept can't land in between.
 *  - A paid visit (captured/refunded) or a clinician payout (owed/transferred) is a
 *    financial record. In `delete` mode such an account is de-identified instead,
 *    so the ledger survives without the patient's identity. The response says so.
 */
export default async function handler(req: Request, res: Response) {
  try {
    const userId = await requirePatient(req, res);
    if (!userId) return;

    // Sensitive: requires a fresh password confirmation (step-up re-auth).
    if (!(await requireRecentAuth(req, res))) return;
    const [u] = await db.select({ email: user.email, role: user.role, isAdmin: user.isAdmin }).from(user).where(eq(user.id, userId)).limit(1);
    if (!u) return res.status(404).json({ error: 'Account not found' });
    const { confirmEmail } = (req.body ?? {}) as { confirmEmail?: string };
    if (!confirmEmail || confirmEmail.trim().toLowerCase() !== u.email.toLowerCase()) {
      return res.status(400).json({ error: 'Type your account email exactly to confirm' });
    }
    if (u.role === 'provider' || u.isAdmin) {
      return res.status(409).json({ error: 'Clinician and admin accounts are removed by an administrator, not self-service' });
    }

    const configured = process.env.ACCOUNT_DELETE_MODE === 'deidentify' ? 'deidentify' : 'delete';

    const outcome = await db.transaction(async (tx) => {
      // Lock this patient's visit rows for the rest of the transaction: an accept that
      // arrives now waits, then finds no queued visit (we cancel them below).
      const mine = await tx
        .select({ id: visits.id, status: visits.status, paymentStatus: visits.paymentStatus, payoutStatus: visits.payoutStatus, pi: visits.stripePaymentIntent, checkout: visits.stripeCheckoutId })
        .from(visits)
        .where(eq(visits.patientUserId, userId))
        .for('update');
      if (mine.some((v) => v.status === 'accepted')) return { blocked: true as const };

      const open = mine.filter((v) => v.status === 'queued' || v.status === 'pending_payment');
      if (open.length) {
        await tx.update(visits).set({ status: 'cancelled' }).where(inArray(visits.id, open.map((v) => v.id)));
      }
      const hasLedger = mine.some(
        (v) => v.paymentStatus === 'captured' || v.paymentStatus === 'refunded' || v.payoutStatus === 'owed' || v.payoutStatus === 'transferred',
      );
      const mode = configured === 'deidentify' || hasLedger ? 'deidentify' : 'delete';

      if (mode === 'deidentify') {
        // Identity and access go; the clinical (and financial) record stays under a tombstone.
        await tx.delete(sessionTable).where(eq(sessionTable.userId, userId));
        await tx.delete(accountTable).where(eq(accountTable.userId, userId));
        await tx.delete(twoFactor).where(eq(twoFactor.userId, userId));
        await tx.delete(patientProfiles).where(eq(patientProfiles.userId, userId));
        await tx
          .update(user)
          .set({ name: 'Deleted patient', email: `deleted+${userId}@deleted.invalid`, emailVerified: false, role: 'deleted', twoFactorEnabled: false, image: null })
          .where(eq(user.id, userId));
      } else {
        await tx.delete(user).where(eq(user.id, userId)); // cascades: sessions, accounts, profile, intakes, visits, checkins, two_factor
      }
      return { blocked: false as const, mode, open, hasLedger };
    });

    if (outcome.blocked) return res.status(409).json({ error: 'A clinician has accepted a visit with you. Finish or cancel that visit first.' });

    // Money back for anything we just cancelled (outside the transaction — Stripe is slow and may fail; retries are safe).
    for (const v of outcome.open) await settleCancelledVisit(v);

    audit(req, { action: outcome.mode === 'deidentify' ? 'patient.deidentify' : 'patient.delete', actorUserId: userId, actorRole: 'patient', resourceType: 'user', resourceId: userId, patientUserId: userId, meta: { cancelledRequests: outcome.open.length, mode: outcome.mode, ledgerRetained: outcome.hasLedger } });
    res.clearCookie('better-auth.session_token', { path: '/' });
    res.clearCookie('__Secure-better-auth.session_token', { path: '/', secure: true });
    res.json({ ok: true, mode: outcome.mode, ledgerRetained: outcome.hasLedger });
  } catch (error) {
    logErr('patient.delete.error', error);
    res.status(500).json({ error: 'Failed to delete your account' });
  }
}
