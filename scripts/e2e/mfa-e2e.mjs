import { execSync } from 'child_process';
import { createHmac } from 'node:crypto';
const BASE = 'http://127.0.0.1:5173';
const DB = process.env.DATABASE_URL ?? 'postgres://acute:localdev@127.0.0.1:5432/acute_insight';
const T = Date.now();
const ok = (label, cond, extra = '') => console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? '  — ' + extra : ''}`);

// RFC 6238 TOTP from a base32 secret (what the authenticator app does)
function b32(s) { const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = '', out = []; for (const c of s.replace(/=+$/, '').toUpperCase()) { const v = A.indexOf(c); if (v < 0) continue; bits += v.toString(2).padStart(5, '0'); } for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2)); return Buffer.from(out); }
function totp(secret, t = Date.now(), step = 30, digits = 6) { const c = Buffer.alloc(8); c.writeBigUInt64BE(BigInt(Math.floor(t / 1000 / step))); const h = createHmac('sha1', b32(secret)).update(c).digest(); const o = h[h.length - 1] & 0xf; const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]; return String(n % 10 ** digits).padStart(digits, '0'); }

function client() {
  let cookie = '';
  const cap = (res) => { const sc = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')].filter(Boolean); for (const c of sc) { const kv = c.split(';')[0]; const [k] = kv.split('='); const parts = cookie ? cookie.split('; ').filter((p) => !p.startsWith(k + '=')) : []; if (!/=;?$/.test(kv) && !/Max-Age=0/i.test(c)) parts.push(kv); cookie = parts.join('; '); } };
  const j = async (path, opts = {}) => {
    const res = await fetch(BASE + path, { ...opts, headers: { 'content-type': 'application/json', origin: BASE, referer: BASE + '/', ...(cookie ? { cookie } : {}), ...(opts.headers || {}) } });
    cap(res); let body; try { body = await res.json(); } catch { body = await res.text(); }
    return { status: res.status, body };
  };
  return { j, clear: () => { cookie = ''; }, cookie: () => cookie };
}
const sql = (q) => execSync(`psql "${DB}" -qtAc "${q.replace(/"/g, '\\"')}"`).toString().trim();

const email = `mfa_dr_${T}@example.test`, password = 'Testpass123!';
const c = client();
let r = await c.j('/api/auth/sign-up/email', { method: 'POST', body: JSON.stringify({ name: 'Dr MFA', email, password }) });
ok('sign up', r.status === 200);
sql(`update "user" set role='provider', is_admin=true where lower(email)=lower('${email}')`);

// enforcement before MFA
r = await c.j('/api/dispatch/me');
ok('clinician API blocked without MFA (403 mfa_required)', r.status === 403 && r.body.code === 'mfa_required', JSON.stringify(r.body));
r = await c.j('/api/provider/intakes');
ok('provider intakes blocked without MFA', r.status === 403 && r.body.code === 'mfa_required');

// enable
r = await c.j('/api/auth/two-factor/enable', { method: 'POST', body: JSON.stringify({ password, issuer: 'Acute Insight' }) });
ok('enable returns totpURI + backup codes', r.status === 200 && /^otpauth:\/\/totp\//.test(r.body.totpURI) && Array.isArray(r.body.backupCodes) && r.body.backupCodes.length >= 8, JSON.stringify(r.body).slice(0, 80));
const uri = new URL(r.body.totpURI); const secret = uri.searchParams.get('secret'); const backup = r.body.backupCodes;
ok('issuer is Acute Insight', uri.searchParams.get('issuer') === 'Acute Insight' && decodeURIComponent(uri.pathname).includes('Acute Insight'), uri.pathname);
let u = sql(`select two_factor_enabled from "user" where lower(email)=lower('${email}')`);
ok('not enabled until a code is verified', u === 'f', u);
r = await c.j('/api/auth/two-factor/verify-totp', { method: 'POST', body: JSON.stringify({ code: '000000' }) });
ok('wrong code rejected', r.status !== 200);
r = await c.j('/api/auth/two-factor/verify-totp', { method: 'POST', body: JSON.stringify({ code: totp(secret) }) });
ok('correct TOTP verifies', r.status === 200, JSON.stringify(r.body).slice(0, 80));
u = sql(`select two_factor_enabled from "user" where lower(email)=lower('${email}')`);
ok('user.two_factor_enabled = true', u === 't');
r = await c.j('/api/dispatch/me');
ok('clinician API open after MFA', r.status === 200);

// sign out, sign in → second factor required
await c.j('/api/auth/sign-out', { method: 'POST', body: '{}' });
c.clear();
r = await c.j('/api/auth/sign-in/email', { method: 'POST', body: JSON.stringify({ email, password }) });
ok('sign-in asks for second factor', r.status === 200 && r.body.twoFactorRedirect === true, JSON.stringify(r.body));
r = await c.j('/api/dispatch/me');
ok('no session yet (password alone)', r.status === 401, String(r.status));
r = await c.j('/api/auth/two-factor/verify-totp', { method: 'POST', body: JSON.stringify({ code: totp(secret), trustDevice: false }) });
ok('TOTP completes sign-in', r.status === 200);
r = await c.j('/api/dispatch/me');
ok('session established after TOTP', r.status === 200);

// backup code path
await c.j('/api/auth/sign-out', { method: 'POST', body: '{}' }); c.clear();
await c.j('/api/auth/sign-in/email', { method: 'POST', body: JSON.stringify({ email, password }) });
r = await c.j('/api/auth/two-factor/verify-backup-code', { method: 'POST', body: JSON.stringify({ code: backup[0] }) });
ok('backup code completes sign-in', r.status === 200, JSON.stringify(r.body).slice(0, 60));
await c.j('/api/auth/sign-out', { method: 'POST', body: '{}' }); c.clear();
await c.j('/api/auth/sign-in/email', { method: 'POST', body: JSON.stringify({ email, password }) });
r = await c.j('/api/auth/two-factor/verify-backup-code', { method: 'POST', body: JSON.stringify({ code: backup[0] }) });
ok('a used backup code is rejected', r.status !== 200);

// patients unaffected
const p = client();
await p.j('/api/auth/sign-up/email', { method: 'POST', body: JSON.stringify({ name: 'Pt', email: `mfa_pt_${T}@example.test`, password }) });
r = await p.j('/api/patient/intakes');
ok('patient access works without MFA', r.status === 200);
