import { describe, it, expect } from 'vitest';
import { verifyEmailTemplate, resetPasswordTemplate, emailAvailable } from './email.js';

describe('email templates', () => {
  it('verification carries the link and no health language', () => {
    const t = verifyEmailTemplate('Will', 'https://acuteinsight.ai/api/auth/verify-email?token=abc');
    expect(t.subject).toContain('Confirm');
    expect(t.html).toContain('https://acuteinsight.ai/api/auth/verify-email?token=abc');
    expect(t.text).toContain('Hi Will');
    expect(t.html).not.toMatch(/patient|visit|symptom|diagnos/i);
  });
  it('reset says one hour and is safe to ignore', () => {
    const t = resetPasswordTemplate(null, 'https://x/reset?token=1');
    expect(t.text).toContain('one hour');
    expect(t.text).toContain('ignore');
    expect(t.text).not.toContain('Hi ');
  });
  it('is off without env', () => {
    expect(emailAvailable()).toBe(false);
  });
});
