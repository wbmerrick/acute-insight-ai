import { describe, it, expect } from 'vitest';
import { clientIp } from './audit.js';

describe('audit helpers', () => {
  it('takes the first forwarded ip', () => {
    const req = { headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' }, ip: '10.0.0.1' } as never;
    expect(clientIp(req)).toBe('203.0.113.9');
  });
  it('falls back to req.ip', () => {
    const req = { headers: {}, ip: '198.51.100.4' } as never;
    expect(clientIp(req)).toBe('198.51.100.4');
  });
});
