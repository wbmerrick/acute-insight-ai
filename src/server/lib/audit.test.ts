import { describe, it, expect } from 'vitest';
import { clientIp } from './audit.js';

describe('clientIp — never trusts the client-written part of X-Forwarded-For', () => {
  it('prefers x-real-ip (set by the edge)', () => {
    const req = { headers: { 'x-real-ip': '198.51.100.4', 'x-forwarded-for': '1.2.3.4, 198.51.100.4' }, socket: { remoteAddress: '10.0.0.1' } } as never;
    expect(clientIp(req)).toBe('198.51.100.4');
  });
  it('takes the LAST forwarded entry (written by our proxy), not the first (written by anyone)', () => {
    const req = { headers: { 'x-forwarded-for': '1.2.3.4, 203.0.113.9' }, socket: { remoteAddress: '10.0.0.1' } } as never;
    expect(clientIp(req)).toBe('203.0.113.9');
  });
  it('a spoofed prefix does not change the identity', () => {
    const honest = { headers: { 'x-forwarded-for': '203.0.113.9' }, socket: {} } as never;
    const spoofed = { headers: { 'x-forwarded-for': '9.9.9.9, 8.8.8.8, 203.0.113.9' }, socket: {} } as never;
    expect(clientIp(spoofed)).toBe(clientIp(honest));
  });
  it('falls back to the socket address', () => {
    const req = { headers: {}, socket: { remoteAddress: '198.51.100.4' } } as never;
    expect(clientIp(req)).toBe('198.51.100.4');
  });
});
