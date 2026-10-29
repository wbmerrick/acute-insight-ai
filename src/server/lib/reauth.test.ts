import { describe, it, expect, afterEach } from 'vitest';
import type { Request, Response } from 'express';
import { reauthWindowMs, isRecentAuth, requireRecentAuth } from './reauth';

describe('reauthWindowMs', () => {
  it('defaults to 10 minutes', () => {
    expect(reauthWindowMs({})).toBe(10 * 60_000);
  });
  it('honours REAUTH_WINDOW_MINUTES', () => {
    expect(reauthWindowMs({ REAUTH_WINDOW_MINUTES: '30' })).toBe(30 * 60_000);
  });
  it('clamps nonsense to the default and huge values to 12h', () => {
    expect(reauthWindowMs({ REAUTH_WINDOW_MINUTES: 'banana' })).toBe(10 * 60_000);
    expect(reauthWindowMs({ REAUTH_WINDOW_MINUTES: '-5' })).toBe(10 * 60_000);
    expect(reauthWindowMs({ REAUTH_WINDOW_MINUTES: '99999' })).toBe(12 * 60 * 60_000);
  });
  it('REQUIRE_REAUTH=off disables the gate', () => {
    expect(reauthWindowMs({ REQUIRE_REAUTH: 'off' })).toBeNull();
    expect(reauthWindowMs({ REQUIRE_REAUTH: 'OFF' })).toBeNull();
    expect(reauthWindowMs({ REQUIRE_REAUTH: 'on' })).toBe(10 * 60_000);
  });
});

describe('isRecentAuth', () => {
  const now = new Date('2026-10-29T12:00:00Z');
  const min = (n: number) => new Date(now.getTime() - n * 60_000);
  const W = 10 * 60_000;

  it('a fresh sign-in counts (createdAt within window, no reauth yet)', () => {
    expect(isRecentAuth(null, min(5), W, now)).toBe(true);
  });
  it('stale sign-in with no reauth fails', () => {
    expect(isRecentAuth(null, min(60), W, now)).toBe(false);
  });
  it('a recent reauth rescues a stale sign-in', () => {
    expect(isRecentAuth(min(2), min(60), W, now)).toBe(true);
  });
  it('a stale reauth on a stale sign-in fails', () => {
    expect(isRecentAuth(min(30), min(60), W, now)).toBe(false);
  });
  it('the most recent of the two timestamps is what counts', () => {
    // createdAt newer than lastReauthAt (new session after an old reauth row would be impossible,
    // but the math must still pick the later one)
    expect(isRecentAuth(min(30), min(1), W, now)).toBe(true);
  });
  it('exactly on the boundary still passes; one ms past fails', () => {
    expect(isRecentAuth(min(10), null, W, now)).toBe(true);
    expect(isRecentAuth(new Date(now.getTime() - W - 1), null, W, now)).toBe(false);
  });
  it('no timestamps at all fails closed', () => {
    expect(isRecentAuth(null, null, W, now)).toBe(false);
  });
});

describe('requireRecentAuth off-switch', () => {
  const prev = process.env.REQUIRE_REAUTH;
  afterEach(() => {
    if (prev === undefined) delete process.env.REQUIRE_REAUTH;
    else process.env.REQUIRE_REAUTH = prev;
  });
  it('returns true without touching the session when REQUIRE_REAUTH=off', async () => {
    process.env.REQUIRE_REAUTH = 'off';
    // No db, no auth: the gate must short-circuit before either is needed.
    const ok = await requireRecentAuth({ headers: {} } as Request, {} as Response);
    expect(ok).toBe(true);
  });
});
