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

describe('templates never render a sign-up name as markup', () => {
  it('escapes HTML in the greeting', async () => {
    const { verifyEmailTemplate, resetPasswordTemplate } = await import('./email.js');
    const evil = '<a href="https://evil.example">Click to keep your account</a>';
    for (const t of [verifyEmailTemplate(evil, 'https://acuteinsight.ai/v'), resetPasswordTemplate(evil, 'https://acuteinsight.ai/r')]) {
      expect(t.html).not.toContain('<a href="https://evil');
      expect(t.html).not.toContain('Hi &lt;a'); // link-shaped names are dropped, not shown escaped
    }
  });
  it('keeps an ordinary name', async () => {
    const { verifyEmailTemplate } = await import('./email.js');
    expect(verifyEmailTemplate("Will O'Brien", 'https://x').html).toContain('Hi Will O&#39;Brien');
  });
});
