/** Pure idle-timer state machine — tested. Drives IdleGuard. */
export interface IdleState { lastActivity: number; warned: boolean }

export function nextIdleState(s: IdleState, now: number, warnAfterMs: number, logoutAfterMs: number): { state: IdleState; action: 'none' | 'warn' | 'logout' } {
  const idle = now - s.lastActivity;
  if (idle >= logoutAfterMs) return { state: s, action: 'logout' };
  if (idle >= warnAfterMs && !s.warned) return { state: { ...s, warned: true }, action: 'warn' };
  return { state: s, action: 'none' };
}

export function touch(s: IdleState, now: number): IdleState {
  return { lastActivity: now, warned: false };
}

/** Clinician/admin surfaces: 15 minutes. Patient portal: 30. */
export const IDLE_LIMITS = {
  clinical: { warnMs: 14 * 60_000, logoutMs: 15 * 60_000 },
  patient: { warnMs: 29 * 60_000, logoutMs: 30 * 60_000 },
} as const;
