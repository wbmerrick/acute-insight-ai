import { describe, it, expect, beforeEach } from 'vitest';
import { toE164, newVisitText, acceptedText, shouldThrottle, _resetThrottle, smsAvailable } from './sms.js';

describe('sms helpers', () => {
  beforeEach(() => _resetThrottle());

  it('normalises US numbers to E.164', () => {
    expect(toE164('(731) 555-0100')).toBe('+17315550100');
    expect(toE164('731-555-0100')).toBe('+17315550100');
    expect(toE164('1 731 555 0100')).toBe('+17315550100');
    expect(toE164('+447700900123')).toBe('+447700900123');
    expect(toE164('555-0100')).toBeNull();
    expect(toE164(null)).toBeNull();
  });

  it('new-visit text carries acuity + state only, never a complaint', () => {
    const t = newVisitText('urgent', 'TN', 'https://acuteinsight.ai');
    expect(t).toContain('Urgent visit waiting in TN');
    expect(t).toContain('https://acuteinsight.ai/clinician');
    expect(t).not.toMatch(/chest|pain|patient/i);
  });

  it('accepted text names the clinician and keeps the 911 line', () => {
    expect(acceptedText('Dr. Alpha', 'DO')).toContain('Dr. Alpha, DO accepted your visit');
    expect(acceptedText(null, null)).toContain('A clinician accepted');
    expect(acceptedText('Dr. Alpha', 'DO')).toContain('call 911');
  });

  it('throttles repeat sends inside the window and allows after it', () => {
    expect(shouldThrottle('c1', 10_000, 1000)).toBe(false);
    expect(shouldThrottle('c1', 10_000, 5000)).toBe(true);
    expect(shouldThrottle('c2', 10_000, 5000)).toBe(false);
    expect(shouldThrottle('c1', 10_000, 12_000)).toBe(false);
  });

  it('is off without Twilio env', () => {
    expect(smsAvailable()).toBe(false);
  });
});
