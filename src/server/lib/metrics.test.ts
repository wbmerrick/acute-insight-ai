import { describe, it, expect } from 'vitest';
import { percentile, median, onlineHours, rate } from './metrics.js';

describe('metrics helpers', () => {
  it('median / p90', () => {
    expect(median([])).toBeNull();
    expect(median([7])).toBe(7);
    expect(median([1, 3])).toBe(2);
    expect(median([5, 1, 3])).toBe(3);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.9)).toBeCloseTo(9.1);
  });
  it('online hours clip to the window and treat open sessions as ongoing', () => {
    const from = new Date('2026-10-26T00:00:00Z'), to = new Date('2026-10-27T00:00:00Z');
    const h = onlineHours(
      [
        { start: new Date('2026-10-25T22:00:00Z'), end: new Date('2026-10-26T02:00:00Z') }, // 2h inside
        { start: new Date('2026-10-26T10:00:00Z'), end: null },                              // 14h open → to
        { start: new Date('2026-10-27T05:00:00Z'), end: null },                              // outside
      ],
      from, to,
    );
    expect(h).toBe(16);
  });
  it('rate guards zero', () => {
    expect(rate(3, 0)).toBeNull();
    expect(rate(3, 4)).toBe(0.75);
  });
});
