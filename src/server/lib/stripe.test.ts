import { describe, it, expect } from 'vitest';
import { verifyWebhook, signForTest, priceCentsFor, pricing, formatUsd } from './stripe.js';

describe('stripe helpers', () => {
  const secret = 'whsec_test_123';
  const body = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed', data: { object: { metadata: { visit_id: '7' } } } });

  it('accepts a correctly signed payload', () => {
    const now = Date.now();
    expect(verifyWebhook(body, signForTest(body, secret, now), secret, 300, now)).toBe(true);
  });
  it('rejects a tampered payload, wrong secret, missing header, stale timestamp', () => {
    const now = Date.now();
    const sig = signForTest(body, secret, now);
    expect(verifyWebhook(body + ' ', sig, secret, 300, now)).toBe(false);
    expect(verifyWebhook(body, sig, 'whsec_other', 300, now)).toBe(false);
    expect(verifyWebhook(body, undefined, secret, 300, now)).toBe(false);
    expect(verifyWebhook(body, sig, secret, 300, now + 10 * 60 * 1000)).toBe(false);
  });

  it('prices come only from env and only when valid', () => {
    expect(priceCentsFor('urgent', {})).toBeNull();
    expect(priceCentsFor('urgent', { PRICE_URGENT_CENTS: '7900' })).toBe(7900);
    expect(priceCentsFor('urgent', { PRICE_URGENT_CENTS: '79.5' })).toBeNull();
    expect(priceCentsFor('urgent', { PRICE_URGENT_CENTS: '0' })).toBeNull();
  });
  it('pricing is unconfigured without a secret key even if prices are set', () => {
    const p = pricing({ PRICE_URGENT_CENTS: '7900' });
    expect(p.configured).toBe(false);
    expect(p.urgent).toBeNull();
    const q = pricing({ STRIPE_SECRET_KEY: 'sk_test_x', PRICE_URGENT_CENTS: '7900', PRICE_ROUTINE_CENTS: '3900' });
    expect(q.configured).toBe(true);
    expect(q.urgent).toBe(7900);
    expect(q.routine).toBe(3900);
    expect(q.telehealth).toBeNull();
    expect(q.emergency).toBeNull();
  });
  it('formats dollars', () => {
    expect(formatUsd(7900)).toBe('$79');
    expect(formatUsd(2950)).toBe('$29.50');
  });
});

describe('payouts', () => {
  it('payout rates come only from env', async () => {
    const { payoutCentsFor, payoutsConfigured, connectEnabled } = await import('./stripe.js');
    expect(payoutCentsFor('routine', {})).toBeNull();
    expect(payoutCentsFor('routine', { CLINICIAN_PAYOUT_ROUTINE_CENTS: '2500' })).toBe(2500);
    expect(payoutsConfigured({})).toBe(false);
    expect(payoutsConfigured({ CLINICIAN_PAYOUT_URGENT_CENTS: '5500' })).toBe(true);
    expect(connectEnabled()).toBe(false);
  });
});
