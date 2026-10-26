import { describe, it, expect, beforeEach } from 'vitest';
import { check, _reset } from './rate-limit.js';

describe('rate limiter', () => {
  beforeEach(() => _reset());
  it('allows up to the limit inside the window, then blocks', () => {
    const t = 1_000_000;
    for (let i = 0; i < 3; i++) expect(check('k', 3, 1000, t + i).allowed).toBe(true);
    const blocked = check('k', 3, 1000, t + 10);
    expect(blocked.allowed).toBe(false);
    expect(blocked.resetMs).toBeGreaterThan(0);
  });
  it('slides: old hits fall out of the window', () => {
    const t = 1_000_000;
    check('k', 2, 1000, t); check('k', 2, 1000, t + 100);
    expect(check('k', 2, 1000, t + 500).allowed).toBe(false);
    expect(check('k', 2, 1000, t + 1101).allowed).toBe(true);
  });
  it('keys are independent', () => {
    check('a', 1, 1000); expect(check('a', 1, 1000).allowed).toBe(false);
    expect(check('b', 1, 1000).allowed).toBe(true);
  });
});
