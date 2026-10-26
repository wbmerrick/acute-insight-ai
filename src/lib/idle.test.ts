import { describe, it, expect } from 'vitest';
import { nextIdleState, touch } from './idle';

describe('idle timer', () => {
  const W = 14 * 60_000, L = 15 * 60_000;
  it('does nothing while active', () => {
    expect(nextIdleState({ lastActivity: 0, warned: false }, 60_000, W, L).action).toBe('none');
  });
  it('warns once at the warn threshold, then logs out at the limit', () => {
    let s = { lastActivity: 0, warned: false };
    let r = nextIdleState(s, W, W, L); expect(r.action).toBe('warn'); s = r.state;
    r = nextIdleState(s, W + 10_000, W, L); expect(r.action).toBe('none');
    r = nextIdleState(s, L, W, L); expect(r.action).toBe('logout');
  });
  it('activity resets the warning', () => {
    let s = { lastActivity: 0, warned: true };
    s = touch(s, W + 5000);
    expect(s.warned).toBe(false);
    expect(nextIdleState(s, W + 6000, W, L).action).toBe('none');
  });
});
