const BASE = 'http://127.0.0.1:5173';
const T = Date.now();
const ok = (label, cond, extra = '') => console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? '  — ' + extra : ''}`);
function client() {
  let cookie = '';
  const cap = (res) => { const sc = res.headers.getSetCookie ? res.headers.getSetCookie() : []; for (const c of sc) { const kv = c.split(';')[0]; const [k] = kv.split('='); const parts = cookie ? cookie.split('; ').filter((p) => !p.startsWith(k + '=')) : []; if (!/=;?$/.test(kv) && !/Max-Age=0/i.test(c)) parts.push(kv); cookie = parts.join('; '); } };
  const j = async (path, opts = {}) => { const res = await fetch(BASE + path, { redirect: 'manual', ...opts, headers: { 'content-type': 'application/json', origin: BASE, referer: BASE + '/', ...(cookie ? { cookie } : {}), ...(opts.headers || {}) } }); cap(res); let body; try { body = await res.json(); } catch { body = null; } return { status: res.status, body, headers: res.headers }; };
  return { j, clear: () => { cookie = ''; } };
}
const sent = async () => (await fetch('http://127.0.0.1:4243/__sent')).json();
const email = `mail_${T}@example.test`;
const c = client();
let r = await c.j('/api/auth/sign-up/email', { method: 'POST', body: JSON.stringify({ name: 'Mail User', email, password: 'Testpass123!' }) });
ok('sign up', r.status === 200);
let mails = await sent();
const v = mails.find((m) => m.to[0] === email && /Confirm/.test(m.subject));
ok('verification email sent on sign-up, PHI-free', !!v && !/patient|visit|symptom/i.test(v.html) && v.from.includes('no-reply@acuteinsight.ai'), v?.subject);
const vurl = v && /href="([^"]+verify-email[^"]+)"/.exec(v.html)?.[1];
ok('contains a verify link', !!vurl, vurl?.slice(0, 60));
r = await c.j('/api/patient/profile');
ok('user not yet verified', r.body?.user && (r.body.user.emailVerified === false || r.body.user.emailVerified == null));
// follow the link (server redirects on success)
const vr = await fetch(vurl.replace(/&amp;/g, '&'), { redirect: 'manual' });
ok('verify link accepted (redirect)', vr.status >= 300 && vr.status < 400, String(vr.status) + ' → ' + (vr.headers.get('location') || '').slice(0, 60));
const { execSync } = await import('child_process');
const ev = execSync(`psql "postgres://acute:localdev@127.0.0.1:5432/acute_insight" -qtAc "select email_verified from \\"user\\" where lower(email)=lower('${email}')"`).toString().trim();
ok('email_verified = true in DB', ev === 't', ev);

// password reset
r = await c.j('/api/auth/request-password-reset', { method: 'POST', body: JSON.stringify({ email, redirectTo: '/reset-password' }) });
ok('reset requested', r.status === 200, JSON.stringify(r.body));
r = await c.j('/api/auth/request-password-reset', { method: 'POST', body: JSON.stringify({ email: 'nobody_' + T + '@example.test', redirectTo: '/reset-password' }) });
ok('unknown email gets the same 200 (no enumeration)', r.status === 200);
mails = await sent();
const rm = mails.find((m) => m.to[0] === email && /Reset/.test(m.subject));
ok('reset email sent with one-hour note', !!rm && /one hour/.test(rm.text), rm?.subject);
const rurl = rm && /href="([^"]+reset-password[^"]+)"/.exec(rm.html)?.[1];
const rr = await fetch(rurl.replace(/&amp;/g, '&'), { redirect: 'manual' });
const loc = rr.headers.get('location') || '';
const token = loc ? new URL(loc, BASE).searchParams.get('token') : null;
ok('reset link redirects to /reset-password?token=…', rr.status >= 300 && rr.status < 400 && /\/reset-password\?token=/.test(loc) && !!token, loc.slice(0, 50));
r = await c.j('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ newPassword: 'Newpass456!', token }) });
ok('password reset accepted', r.status === 200, JSON.stringify(r.body));
c.clear();
r = await c.j('/api/auth/sign-in/email', { method: 'POST', body: JSON.stringify({ email, password: 'Testpass123!' }) });
ok('old password rejected', r.status !== 200);
r = await c.j('/api/auth/sign-in/email', { method: 'POST', body: JSON.stringify({ email, password: 'Newpass456!' }) });
ok('new password works', r.status === 200);
r = await c.j('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ newPassword: 'Again789!', token }) });
ok('reset token is single-use', r.status !== 200);
