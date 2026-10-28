import type { Request, Response } from 'express';
import { and, eq } from 'drizzle-orm';
import { db } from '../../../db/client.js';
import { visits, clinicianProfiles } from '../../../db/schema.js';
import { verifyWebhook, releasePayment } from '../../../lib/stripe.js';
import { logErr, publicBaseUrl } from '../../../lib/dispatch.js';
import { notifyClinicians } from '../../dispatch/visits/POST.js';

/**
 * Stripe → us. Registered with express.raw so the signature can be checked on
 * the exact bytes. checkout.session.completed = card authorized → visit queued.
 * checkout.session.expired / payment failed → visit cancelled.
 */
export default async function handler(req: Request, res: Response) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return res.status(503).json({ error: 'Webhook not configured' });
  const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
  if (!verifyWebhook(raw, req.headers['stripe-signature'] as string | undefined, secret)) {
    return res.status(400).json({ error: 'Bad signature' });
  }

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(raw);
  } catch {
    return res.status(400).json({ error: 'Bad payload' });
  }

  try {
    const obj = event.data.object;
    const visitId = Number((obj.metadata as Record<string, string> | undefined)?.visit_id ?? obj.client_reference_id);

    if (event.type === 'checkout.session.completed' && Number.isInteger(visitId)) {
      const [v] = await db
        .update(visits)
        .set({ status: 'queued', paymentStatus: 'authorized', stripePaymentIntent: String(obj.payment_intent ?? ''), queuedAt: new Date() })
        .where(and(eq(visits.id, visitId), eq(visits.status, 'pending_payment')))
        .returning({ id: visits.id, acuity: visits.acuity, patientState: visits.patientState });
      if (v) {
        const base = publicBaseUrl(req);
        void notifyClinicians(v.acuity, v.patientState, base);
      } else if (typeof obj.payment_intent === 'string') {
        // The visit was cancelled (or swept) while Checkout was still open and the patient
        // finished anyway. Don't leave an authorization on their card.
        const [cur] = await db.select({ status: visits.status, paymentStatus: visits.paymentStatus }).from(visits).where(eq(visits.id, visitId)).limit(1);
        if (cur && cur.status === 'cancelled' && cur.paymentStatus !== 'released') {
          try {
            await releasePayment(obj.payment_intent);
            await db.update(visits).set({ paymentStatus: 'released', stripePaymentIntent: obj.payment_intent }).where(eq(visits.id, visitId));
          } catch (err) {
            logErr('stripe.webhook.late_release_failed', err);
          }
        }
      }
    } else if (event.type === 'account.updated' && typeof obj.id === 'string') {
      const enabled = obj.payouts_enabled === true && obj.charges_enabled !== false;
      await db.update(clinicianProfiles).set({ payoutsEnabled: enabled }).where(eq(clinicianProfiles.stripeAccountId, obj.id));
    } else if ((event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') && Number.isInteger(visitId)) {
      await db
        .update(visits)
        .set({ status: 'cancelled', paymentStatus: 'failed' })
        .where(and(eq(visits.id, visitId), eq(visits.status, 'pending_payment')));
    }
    res.json({ received: true });
  } catch (error) {
    logErr('stripe.webhook.error', error);
    res.status(500).json({ error: 'Webhook handling failed' });
  }
}
