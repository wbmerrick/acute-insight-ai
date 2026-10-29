/**
 * Transactional email — Resend over REST, no SDK. Off until RESEND_API_KEY and
 * EMAIL_FROM are set (then every send is logged by recipient hash, never body).
 * Templates are PHI-free: a name and a link, nothing about health.
 */
import { createHash } from 'node:crypto';

export function emailAvailable(): boolean {
  return !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

const mask = (to: string) => createHash('sha256').update(to.toLowerCase()).digest('hex').slice(0, 12);

export async function sendEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
  if (!emailAvailable()) {
    console.log(JSON.stringify({ event: 'email.skipped', reason: 'resend_not_configured', to: mask(to), subject }));
    return false;
  }
  try {
    const res = await fetch((process.env.RESEND_API_BASE ?? 'https://api.resend.com') + '/emails', { // base override only for local tests
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, html, text }),
    });
    if (!res.ok) {
      console.error(JSON.stringify({ event: 'email.failed', status: res.status, to: mask(to), subject }));
      return false;
    }
    console.log(JSON.stringify({ event: 'email.sent', to: mask(to), subject }));
    return true;
  } catch (err) {
    console.error(JSON.stringify({ event: 'email.error', to: mask(to), error: err instanceof Error ? err.message : String(err) }));
    return false;
  }
}

// ─── Templates (pure, tested) ────────────────────────────────────────────────

/** User-supplied text (a sign-up name) must never become markup in someone's inbox. */
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

/** A display name for a greeting: escaped, trimmed, one line, short. Null when it isn't usable. */
function greetName(name: string | null): string | null {
  if (!name) return null;
  const clean = name.replace(/[\r\n\t]+/g, ' ').trim().slice(0, 60);
  if (!clean || /https?:|www\.|@/i.test(clean)) return null; // a "name" that is a link or address is not a name
  return escapeHtml(clean);
}

function shell(title: string, body: string, cta: { label: string; url: string }, footnote: string) {
  const html = `<!doctype html><html><body style="margin:0;background:#0b0f14;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#e6edf3">
<div style="max-width:520px;margin:0 auto;padding:40px 24px">
  <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#22e07a;margin-bottom:16px">Acute Insight</div>
  <h1 style="font-size:22px;margin:0 0 12px">${title}</h1>
  <p style="font-size:15px;line-height:1.6;color:#aab4c0;margin:0 0 24px">${body}</p>
  <a href="${cta.url}" style="display:inline-block;background:#22e07a;color:#0b0f14;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px">${cta.label}</a>
  <p style="font-size:12px;line-height:1.6;color:#6b7684;margin:28px 0 0">${footnote}<br>If the button doesn't work, paste this into your browser:<br><span style="word-break:break-all">${cta.url}</span></p>
</div></body></html>`;
  const text = `${title}\n\n${body}\n\n${cta.label}: ${cta.url}\n\n${footnote}`;
  return { html, text };
}

export function verifyEmailTemplate(rawName: string | null, url: string) {
  const name = greetName(rawName);
  const t = shell(
    'Confirm your email',
    `${name ? `Hi ${name}, t` : 'T'}ap below to confirm this address for your Acute Insight account.`,
    { label: 'Confirm email', url },
    "If you didn't create an account, you can ignore this.",
  );
  return { subject: 'Confirm your email — Acute Insight', ...t };
}

export function resetPasswordTemplate(rawName: string | null, url: string) {
  const name = greetName(rawName);
  const t = shell(
    'Reset your password',
    `${name ? `Hi ${name}, s` : 'S'}omeone asked to reset the password for this Acute Insight account. The link works for one hour.`,
    { label: 'Choose a new password', url },
    "If you didn't ask for this, your password is unchanged and you can ignore this email.",
  );
  return { subject: 'Reset your password — Acute Insight', ...t };
}
