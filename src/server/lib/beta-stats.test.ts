import { describe, it, expect } from 'vitest';
import { utcDay } from './beta-stats';

describe('utcDay', () => {
  it('buckets by UTC calendar date', () => {
    expect(utcDay(new Date('2026-10-29T00:00:01Z'))).toBe('2026-10-29');
    expect(utcDay(new Date('2026-10-29T23:59:59Z'))).toBe('2026-10-29');
    // 11 PM Central on the 28th is already the 29th in UTC — the bucket is UTC on purpose.
    expect(utcDay(new Date('2026-10-28T23:00:00-05:00'))).toBe('2026-10-29');
  });
});
