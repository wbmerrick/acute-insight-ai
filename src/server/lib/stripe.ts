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
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { visits } from '../db/schema.js';
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

/** Stripe answered with an error. 4xx = our request is wrong (don't retry); 5xx/network = transient. */
export class StripeError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) {
    super(message);
  }
  get transient(): boolean {
    return this.status === 0 || this.status >= 500 || this.status === 429;
  }
}

async function stripePost<T>(path: string, body: Record<string, unknown>, idempotencyKey?: string): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Stripe not configured');
  let res: globalThis.Response;
  try {
    res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
      body: flatten(body).toString(),
    });
  } catch (err) {
    throw new StripeError(`Stripe ${path}: ${(err as Error).message}`, 0);
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: { message?: string; code?: string } };
  if (!res.ok) throw new StripeError(`Stripe ${path}: ${data.error?.message ?? res.status}`, res.status, data.error?.code);
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
    // Same key within a minute dedupes double-clicks; a later re-open (after the
    // first session expired) gets a fresh key — Stripe rejects a reused key with
    // different params (expires_at moves), which used to make re-opening fail.
    `visit-${opts.visitId}-checkout-${Math.floor(Date.now() / 60_000)}`,
  );
}

/** Close an unfinished Checkout so a cancelled request can't be paid afterwards. */
export async function expireCheckout(sessionId: string): Promise<void> {
  await stripePost(`/checkout/sessions/${sessionId}/expire`, {});
}

/** Full refund of a captured payment (visit was charged but never completed). */
export async function refundPayment(paymentIntent: string): Promise<void> {
  await stripePost('/refunds', { payment_intent: paymentIntent }, `refund-${paymentIntent}`);
}

export async function capturePayment(paymentIntent: string): Promise<void> {
  await stripePost(`/payment_intents/${paymentIntent}/capture`, {}, `capture-${paymentIntent}`);
}

export async function releasePayment(paymentIntent: string): Promise<void> {
  await stripePost(`/payment_intents/${paymentIntent}/cancel`, { cancellation_reason: 'abandoned' }, `cancel-${paymentIntent}`);
}

/**
 * A visit just became 'cancelled' (patient cancel, hold-window sweep, account
 * deletion). Put the money back where it was:
 *   authorized → release the hold · captured → full refund · pending → close the Checkout.
 * Returns what happened so callers can audit it. Stripe failures are logged, never thrown —
 * the visit is already cancelled; money reconciliation can retry.
 */
export async function settleCancelledVisit(v: {
  id: number;
  paymentStatus: string | null;
  pi: string | null;
  checkout: string | null;
}): Promise<'released' | 'refunded' | 'checkout_closed' | 'none' | 'failed'> {
  try {
    if (v.paymentStatus === 'authorized' && v.pi) {
      await releasePayment(v.pi);
      await db.update(visits).set({ paymentStatus: 'released' }).where(eq(visits.id, v.id));
      return 'released';
    }
    if (v.paymentStatus === 'captured' && v.pi) {
      await refundPayment(v.pi);
      await db.update(visits).set({ paymentStatus: 'refunded' }).where(eq(visits.id, v.id));
      return 'refunded';
    }
    if (v.paymentStatus === 'pending' && v.checkout && stripeConfigured()) {
      await expireCheckout(v.checkout);
      return 'checkout_closed';
    }
    return 'none';
  } catch (err) {
    console.error(JSON.stringify({ event: 'stripe.settle_failed', visit: v.id, paymentStatus: v.paymentStatus, error: (err as Error).message }));
    return 'failed';
  }
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

// ─── Clinician payouts (Stripe Connect Express) ──────────────────────────────
// Gated separately from charging: STRIPE_CONNECT_ENABLED=true. Until the
// physician-owned entity exists, nothing here runs — the ledger still accrues.

export function connectEnabled(): boolean {
  return stripeConfigured() && process.env.STRIPE_CONNECT_ENABLED === 'true';
}

/** Payout to the clinician for a visit of this acuity, from env; null = no payout configured. */
export function payoutCentsFor(acuity: string, env: NodeJS.ProcessEnv = process.env): number | null {
  const raw = env[`CLINICIAN_PAYOUT_${acuity.toUpperCase()}_CENTS`];
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function payoutsConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return ['urgent', 'telehealth', 'routine', 'selfcare'].some((a) => payoutCentsFor(a, env) !== null);
}

export async function createConnectAccount(email: string, userId: string): Promise<{ id: string }> {
  return stripePost<{ id: string }>('/accounts', {
    type: 'express',
    country: 'US',
    email,
    capabilities: { transfers: { requested: true } },
    business_type: 'individual',
    metadata: { user_id: userId },
  }, `connect-account-${userId}`);
}

export async function createAccountLink(accountId: string, refreshUrl: string, returnUrl: string): Promise<{ url: string }> {
  return stripePost<{ url: string }>('/account_links', { account: accountId, refresh_url: refreshUrl, return_url: returnUrl, type: 'account_onboarding' });
}

export async function createTransfer(accountId: string, amountCents: number, visitId: number): Promise<{ id: string }> {
  return stripePost<{ id: string }>('/transfers', {
    amount: amountCents,
    currency: 'usd',
    destination: accountId,
    description: `Acute Insight visit #${visitId}`,
    metadata: { visit_id: String(visitId) },
  }, `transfer-visit-${visitId}`);
}
