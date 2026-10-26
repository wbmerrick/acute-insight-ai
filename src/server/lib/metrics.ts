/** Pure helpers for dispatch metrics — tested. */

export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export const median = (v: number[]) => percentile(v, 0.5);

/** Hours of online time inside [from, to], clipping sessions to the window; open sessions end at `to`. */
export function onlineHours(sessions: { start: Date; end: Date | null }[], from: Date, to: Date): number {
  let ms = 0;
  for (const s of sessions) {
    const a = Math.max(s.start.getTime(), from.getTime());
    const b = Math.min((s.end ?? to).getTime(), to.getTime());
    if (b > a) ms += b - a;
  }
  return ms / 3600000;
}

export function rate(n: number, d: number): number | null {
  return d > 0 ? n / d : null;
}
