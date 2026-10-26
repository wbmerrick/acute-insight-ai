import type { Request, Response } from 'express';
import { and, eq, lt, inArray } from 'drizzle-orm';
import { db } from '../../../db/client.js';
import { visits } from '../../../db/schema.js';
import { releasePayment } from '../../../lib/stripe.js';
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
    console.log(JSON.stringify({ event: 'dispatch.sweep', cancelled: stale.length, released, holdHours: HOLD_HOURS }));
    res.json({ ok: true, cancelled: stale.length, released });
  } catch (error) {
    logErr('dispatch.sweep.error', error);
    res.status(500).json({ error: 'Sweep failed' });
  }
}
