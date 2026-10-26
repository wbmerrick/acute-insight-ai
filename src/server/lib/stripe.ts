/**
 * Stripe for dispatch — plain REST, no SDK, env-gated.
 *
 * Money model: the patient's card is AUTHORIZED when they request a clinician
 * (Checkout Session with manual capture), CAPTURED the moment a clinician
 * accepts, and RELEASED (authorization cancelled) if nobody accepts inside the
 * hold window or the patient cancels. Nobody pays for a visit that never happens.
 *
 * Off until STRIPE_SECRET_KEY is set AND a price exists for the acuity:
 *   PRICE_URGENT_CENTS, PRICE_TELEHEALTH_CENTS, PRICE_ROUTINE_CENTS, PRICE_SELFCARE_CENTS
 * Webhooks need STRIPE_WEBHOOK_SECRET. With nothing set, requests queue for free.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Acuity } from '../../lib/clinical-brief.js';

const API = process.env.STRIPE_API_BASE ?? 'https://api.stripe.com/v1'; // override only for local tests

export function stripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

/** Price in cents for an acuity, or null when unpriced (→ free path). */
export function priceCentsFor(acuity: string, env: NodeJS.ProcessEnv = process.env): number | null {
  const key = `PRICE_${acuity.toUpperCase()}_CENTS`;
  const raw = env[key];
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function pricing(env: NodeJS.ProcessEnv = process.env): Record<Acuity, number | null> & { configured: boolean } {
  const configured = !!env.STRIPE_SECRET_KEY;
  const get = (a: Acuity) => (configured ? priceCentsFor(a, env) : null);
  return {
    configured,
    emergency: null,
    urgent: get('urgent'),
    telehealth: get('telehealth'),
    routine: get('routine'),
    selfcare: get('selfcare'),
  };
}

export function formatUsd(cents: number): string {
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
}

// ─── REST ────────────────────────────────────────────────────────────────────

function flatten(obj: Record<string, unknown>, prefix = '', out = new URLSearchParams()): URLSearchParams {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) v.forEach((item, i) => (typeof item === 'object' ? flatten(item as Record<string, unknown>, `${key}[${i}]`, out) : out.append(`${key}[${i}]`, String(item))));
    else if (typeof v === 'object') flatten(v as Record<string, unknown>, key, out);
    else out.append(key, String(v));
  }
  return out;
}

async function stripePost<T>(path: string, body: Record<string, unknown>, idempotencyKey?: string): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Stripe not configured');
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: flatten(body).toString(),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: { message?: string; code?: string } };
  if (!res.ok) throw new Error(`Stripe ${path}: ${data.error?.message ?? res.status}`);
  return data;
}

export interface CheckoutSession {
  id: string;
  url: string;
  payment_intent: string | null;
}

/** Hosted Checkout with a manual-capture PaymentIntent — authorizes now, captures later. */
export async function createVisitCheckout(opts: {
  visitId: number;
  amountCents: number;
  acuityLabel: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<CheckoutSession> {
  return stripePost<CheckoutSession>(
    '/checkout/sessions',
    {
      mode: 'payment',
      customer_email: opts.customerEmail,
      success_url: opts.successUrl,
      cancel_url: opts.cancelUrl,
      client_reference_id: String(opts.visitId),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: opts.amountCents,
            product_data: {
              name: `${opts.acuityLabel} visit — Acute Insight`,
              description: 'Your card is held now and charged only when a clinician accepts your visit.',
            },
          },
        },
      ],
      payment_intent_data: {
        capture_method: 'manual',
        description: `Acute Insight visit #${opts.visitId}`,
        metadata: { visit_id: String(opts.visitId) },
      },
      metadata: { visit_id: String(opts.visitId) },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 min to finish checkout
    },
    `visit-${opts.visitId}-checkout`,
  );
}

export async function capturePayment(paymentIntent: string): Promise<void> {
  await stripePost(`/payment_intents/${paymentIntent}/capture`, {}, `capture-${paymentIntent}`);
}

export async function releasePayment(paymentIntent: string): Promise<void> {
  await stripePost(`/payment_intents/${paymentIntent}/cancel`, { cancellation_reason: 'abandoned' }, `cancel-${paymentIntent}`);
}

// ─── Webhook signature (Stripe-Signature: t=…,v1=…) ─────────────────────────

export function verifyWebhook(rawBody: string, sigHeader: string | undefined, secret: string, toleranceSec = 300, now = Date.now()): boolean {
  if (!sigHeader) return false;
  const parts = Object.fromEntries(sigHeader.split(',').map((p) => p.split('=') as [string, string]));
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;
  if (Math.abs(now / 1000 - Number(t)) > toleranceSec) return false;
  const expected = createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(v1);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function signForTest(rawBody: string, secret: string, now = Date.now()): string {
  const t = Math.floor(now / 1000);
  const v1 = createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex');
  return `t=${t},v1=${v1}`;
}
