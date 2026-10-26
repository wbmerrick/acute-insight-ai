import type { Request, Response } from 'express';
import { and, eq, lt, inArray } from 'drizzle-orm';
import { db } from '../../../db/client.js';
import { visits, clinicianProfiles } from '../../../db/schema.js';
import { releasePayment, connectEnabled, createTransfer } from '../../../lib/stripe.js';
import { logErr } from '../../../lib/dispatch.js';

const HOLD_HOURS = Number(process.env.VISIT_HOLD_HOURS ?? 4);

/**
 * Hourly (Vercel cron, bearer CRON_SECRET). A request nobody accepted inside the
 * hold window is cancelled and any card authorization released — the patient is
 * never charged for a visit that didn't happen. Stale unpaid checkouts are closed too.
 */
export default async function handler(req: Request, res: Response) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const cutoff = new Date(Date.now() - HOLD_HOURS * 3600 * 1000);
    const stale = await db
      .update(visits)
      .set({ status: 'cancelled' })
      .where(and(inArray(visits.status, ['queued', 'pending_payment']), lt(visits.queuedAt, cutoff)))
      .returning({ id: visits.id, paymentStatus: visits.paymentStatus, pi: visits.stripePaymentIntent });

    let released = 0;
    for (const v of stale) {
      if (v.paymentStatus === 'authorized' && v.pi) {
        try {
          await releasePayment(v.pi);
          await db.update(visits).set({ paymentStatus: 'released' }).where(eq(visits.id, v.id));
          released++;
        } catch (err) {
          logErr('dispatch.sweep.release_failed', err);
        }
      }
    }
    // Payouts: move owed ledger entries to clinicians whose Connect account is ready.
    let transferred = 0;
    if (connectEnabled()) {
      const owed = await db
        .select({ id: visits.id, cents: visits.payoutCents, clinicianUserId: visits.clinicianUserId })
        .from(visits)
        .where(eq(visits.payoutStatus, 'owed'))
        .limit(100);
      for (const v of owed) {
        if (!v.cents || !v.clinicianUserId) continue;
        const [c] = await db.select({ acct: clinicianProfiles.stripeAccountId, ready: clinicianProfiles.payoutsEnabled }).from(clinicianProfiles).where(eq(clinicianProfiles.userId, v.clinicianUserId)).limit(1);
        if (!c?.acct || !c.ready) continue;
        try {
          const t = await createTransfer(c.acct, v.cents, v.id);
          await db.update(visits).set({ payoutStatus: 'transferred', stripeTransferId: t.id }).where(and(eq(visits.id, v.id), eq(visits.payoutStatus, 'owed')));
          transferred++;
        } catch (err) {
          logErr('dispatch.sweep.transfer_failed', err);
          await db.update(visits).set({ payoutStatus: 'failed' }).where(eq(visits.id, v.id));
        }
      }
    }

    console.log(JSON.stringify({ event: 'dispatch.sweep', cancelled: stale.length, released, transferred, holdHours: HOLD_HOURS }));
    res.json({ ok: true, cancelled: stale.length, released, transferred });
  } catch (error) {
    logErr('dispatch.sweep.error', error);
    res.status(500).json({ error: 'Sweep failed' });
  }
}
