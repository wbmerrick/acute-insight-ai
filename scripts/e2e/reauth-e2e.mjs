// Step-up re-authentication: sensitive endpoints demand a fresh password
// confirmation. A new sign-in counts for REAUTH_WINDOW_MINUTES; after that the
// endpoint answers 403 { code: 'reauth_required' } until POST /api/auth/reauth
// succeeds. Covers patient export/delete, clinician licensure changes (and the
// non-sensitive fields that must stay friction-free), admin role changes,
// assignments, and the audit CSV export — plus the audit rows reauth leaves.
import { execSync } from 'child_process';
const BASE = 'http://127.0.0.1:5173'; const DB = process.env.DATABASE_URL ?? 'postgres://acute:localdev@127.0.0.1:5432/acute_insight'; const T = Date.now();
const ok = (l, c, x = '') => console.log(`${c ? 'PASS' : 'FAIL'}  ${l}${x ? '  — ' + x : ''}`);
function client() { let cookie = ''; const cap = (res) => { const sc = res.headers.getSetCookie ? res.headers.getSetCookie() : []; for (const c of sc) { const kv = c.split(';')[0]; const [k] = kv.split('='); const parts = cookie ? cookie.split('; ').filter((p) => !p.startsWith(k + '=')) : []; if (!/=;?$/.test(kv)) parts.push(kv); cookie = parts.join('; '); } }; const j = async (path, opts = {}) => { const res = await fetch(BASE + path, { ...opts, headers: { 'content-type': 'application/json', origin: BASE, referer: BASE + '/', ...(cookie ? { cookie } : {}), ...(opts.headers || {}) } }); cap(res); let body; try { body = await res.json(); } catch { body = null; } return { status: res.status, body, headers: res.headers }; }; const raw = async (path, opts = {}) => { const res = await fetch(BASE + path, { ...opts, headers: { origin: BASE, referer: BASE + '/', ...(cookie ? { cookie } : {}), ...(opts.headers || {}) } }); cap(res); return res; }; return { j, raw }; }
const sql = (q) => execSync(`psql "${DB}" -qtAc "${q.replace(/"/g, '\\"')}"`).toString().trim();
const stale = (uid) => sql(`update session set created_at = now() - interval '2 hours', last_reauth_at = null where user_id='${uid}'`);
const PW = 'Testpass123!';
const needsReauth = (r) => r.status === 403 && r.body?.code === 'reauth_required';

// ── Patient: export and delete ────────────────────────────────────────────────
const pt = client(); const ptEmail = `reauth_pt_${T}@example.test`;
let r = await pt.j('/api/auth/sign-up/email', { method: 'POST', body: JSON.stringify({ name: 'Reauth Patient', email: ptEmail, password: PW }) });
const ptId = r.body.user.id;
r = await pt.j('/api/patient/export');
ok('fresh sign-in: export works without a prompt', r.status === 200 && /attachment/.test(r.headers.get('content-disposition') || ''));
stale(ptId);
r = await pt.j('/api/patient/export');
ok('stale session: export answers 403 reauth_required', needsReauth(r), `${r.status} ${JSON.stringify(r.body)}`);
r = await pt.j('/api/auth/reauth', { method: 'POST', body: JSON.stringify({ password: 'WrongPass999!' }) });
ok('wrong password: reauth refused (401)', r.status === 401, String(r.status));
r = await pt.j('/api/patient/export');
ok('still gated after a failed attempt', needsReauth(r));
r = await pt.j('/api/auth/reauth', { method: 'POST', body: JSON.stringify({ password: PW }) });
ok('correct password: reauth ok', r.status === 200 && r.body?.ok === true, JSON.stringify(r.body));
r = await pt.j('/api/patient/export');
ok('export unlocked after reauth', r.status === 200 && r.body?.account?.email === ptEmail);
stale(ptId);
r = await pt.j('/api/patient/delete', { method: 'POST', body: JSON.stringify({ confirmEmail: ptEmail }) });
ok('stale session: delete gated even with the exact email', needsReauth(r));
await pt.j('/api/auth/reauth', { method: 'POST', body: JSON.stringify({ password: PW }) });
r = await pt.j('/api/patient/delete', { method: 'POST', body: JSON.stringify({ confirmEmail: ptEmail }) });
ok('delete works after reauth', r.status === 200, JSON.stringify(r.body));

// ── Clinician: licensure changes gated, availability friction-free ───────────
const dr = client(); const drEmail = `reauth_dr_${T}@example.test`;
r = await dr.j('/api/auth/sign-up/email', { method: 'POST', body: JSON.stringify({ name: 'Dr Reauth', email: drEmail, password: PW }) });
const drId = r.body.user.id;
sql(`update "user" set role='provider' where id='${drId}'`);
r = await dr.j('/api/dispatch/me', { method: 'PUT', body: JSON.stringify({ displayName: 'Dr. Reauth', credential: 'DO', stateLicenses: ['TN'], maxAcuity: 'urgent', online: true }) });
ok('fresh sign-in: licenses set without a prompt', r.status === 200 && r.body.stateLicenses.join(',') === 'TN');
stale(drId);
r = await dr.j('/api/dispatch/me', { method: 'PUT', body: JSON.stringify({ online: false }) });
ok('stale session: going offline needs no prompt', r.status === 200 && r.body.online === false);
r = await dr.j('/api/dispatch/me', { method: 'PUT', body: JSON.stringify({ displayName: 'Dr. R. Reauth', notifySms: false }) });
ok('stale session: name/notify changes need no prompt', r.status === 200);
r = await dr.j('/api/dispatch/me', { method: 'PUT', body: JSON.stringify({ stateLicenses: ['TN'] }) });
ok('stale session: resending the SAME licenses needs no prompt', r.status === 200);
r = await dr.j('/api/dispatch/me', { method: 'PUT', body: JSON.stringify({ stateLicenses: ['TN', 'KY'] }) });
ok('stale session: ADDING a license is gated', needsReauth(r), `${r.status} ${JSON.stringify(r.body)}`);
r = await dr.j('/api/dispatch/me', { method: 'PUT', body: JSON.stringify({ maxAcuity: 'telehealth' }) });
ok('stale session: changing scope is gated', needsReauth(r));
r = await dr.j('/api/dispatch/me', { method: 'PUT', body: JSON.stringify({ credential: 'MD' }) });
ok('stale session: changing credential is gated', needsReauth(r));
ok('gated attempts changed nothing', sql(`select state_licenses::text || '|' || coalesce(max_acuity,'urgent') || '|' || credential from clinician_profiles where user_id='${drId}'`) === '["TN"]|urgent|DO');
await dr.j('/api/auth/reauth', { method: 'POST', body: JSON.stringify({ password: PW }) });
r = await dr.j('/api/dispatch/me', { method: 'PUT', body: JSON.stringify({ stateLicenses: ['TN', 'KY'], maxAcuity: 'telehealth' }) });
ok('licensure change works after reauth', r.status === 200 && r.body.stateLicenses.sort().join(',') === 'KY,TN' && r.body.maxAcuity === 'telehealth');

// ── Admin: role change, assignments, audit export ─────────────────────────────
const ad = client(); const adEmail = `reauth_ad_${T}@example.test`;
r = await ad.j('/api/auth/sign-up/email', { method: 'POST', body: JSON.stringify({ name: 'Admin Reauth', email: adEmail, password: PW }) });
const adId = r.body.user.id;
sql(`update "user" set is_admin=true, role='provider' where id='${adId}'`);
const tg = client(); const tgEmail = `reauth_tg_${T}@example.test`;
r = await tg.j('/api/auth/sign-up/email', { method: 'POST', body: JSON.stringify({ name: 'Target', email: tgEmail, password: PW }) });
const tgId = r.body.user.id;
r = await ad.j(`/api/admin/users/${tgId}/role`, { method: 'PUT', body: JSON.stringify({ role: 'provider' }) });
ok('fresh sign-in: role change works without a prompt', r.status === 200, JSON.stringify(r.body));
stale(adId);
r = await ad.j(`/api/admin/users/${tgId}/role`, { method: 'PUT', body: JSON.stringify({ role: 'patient' }) });
ok('stale session: role change gated', needsReauth(r));
ok('gated role change did not land', sql(`select role from "user" where id='${tgId}'`) === 'provider');
r = await ad.j('/api/admin/assignments', { method: 'POST', body: JSON.stringify({ providerId: drId, patientId: tgId }) });
ok('stale session: assignment gated', needsReauth(r));
const rawExport = await ad.raw('/api/admin/audit/export');
ok('stale session: audit CSV export gated', rawExport.status === 403 && (await rawExport.json()).code === 'reauth_required');
r = await ad.j('/api/auth/reauth', { method: 'POST', body: JSON.stringify({ password: PW }) });
ok('admin reauth ok', r.status === 200);
r = await ad.j(`/api/admin/users/${tgId}/role`, { method: 'PUT', body: JSON.stringify({ role: 'patient' }) });
ok('role change works after reauth', r.status === 200);
r = await ad.j('/api/admin/assignments', { method: 'POST', body: JSON.stringify({ providerId: drId, patientId: tgId }) });
ok('assignment works after reauth', r.status === 200);
const csv = await ad.raw('/api/admin/audit/export');
ok('audit export streams CSV after reauth', csv.status === 200 && /csv/.test(csv.headers.get('content-type') || '') && (await csv.text()).includes('auth.reauth'));

// ── Audit trail of the handshake itself ───────────────────────────────────────
ok('audit holds failed and successful reauth attempts',
  sql(`select count(*) from audit_events where action='auth.reauth' and (meta->>'ok')='false' and actor_user_id='${ptId}'`) === '1' &&
  Number(sql(`select count(*) from audit_events where action='auth.reauth' and (meta->>'ok')='true'`)) >= 4);
