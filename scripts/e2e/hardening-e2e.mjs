// Review-round-2 behaviours: forged-cookie rate limit, locked completed intake,
// check-in re-resolve guard, profile validation, email escaping, server-side idle.
import { execSync } from 'child_process';
const BASE = 'http://127.0.0.1:5173';
const DB = process.env.DATABASE_URL ?? 'postgres://acute:localdev@127.0.0.1:5432/acute_insight';
const T = Date.now();
let fails = 0;
const ok = (label, cond, extra = '') => { if (!cond) fails++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? '  — ' + extra : ''}`); };
const psql = (q) => execSync(`psql "${DB}" -qtAc "${q.replace(/"/g, '\\"')}"`).toString().trim();

function client() {
  let cookie = '';
  const cap = (res) => { const sc = res.headers.get('set-cookie'); if (sc) cookie = sc.split(/,(?=[^;]+=)/).map((c) => c.split(';')[0].trim()).join('; '); };
  const j = async (path, opts = {}) => {
    const res = await fetch(BASE + path, { ...opts, headers: { 'content-type': 'application/json', origin: BASE, ...(cookie ? { cookie } : {}), ...(opts.headers || {}) } });
    cap(res); let body; try { body = await res.json(); } catch { body = null; }
    return { status: res.status, body, headers: res.headers };
  };
  return { j, cookie: () => cookie };
}
async function signup(c, name, email) {
  const r = await c.j('/api/auth/sign-up/email', { method: 'POST', body: JSON.stringify({ name, email, password: 'Testpass123!' }) });
  if (r.status !== 200) throw new Error('signup ' + r.status + ' ' + JSON.stringify(r.body));
  return r.body.user.id;
}
const routine = ['two weeks', 'no', 'no fever', 'no', 'mild'];
async function completeIntake(c, cc, answers, extra = {}) {
  const st = await c.j('/api/intake/start', { method: 'POST' });
  const comp = await c.j(`/api/intake/${st.body.id}/complete`, { method: 'POST', body: JSON.stringify({ chiefComplaint: cc, responses: answers.map((a, i) => ({ questionId: `q${i}`, question: 'Q', answer: a })), ...extra }) });
  return { id: st.body.id, status: comp.status, body: comp.body };
}

// ── Open beta: a signed-out visitor chats with Ace continuously (2026-10-29) ──
{
  const chat = async (msgs) => {
    const res = await fetch(BASE + '/api/intake/chat', { method: 'POST', headers: { 'content-type': 'application/json', origin: BASE }, body: JSON.stringify({ messages: msgs }) });
    return { status: res.status, text: await res.text() };
  };
  const m = [];
  let last = null;
  for (let i = 1; i <= 5; i++) {
    m.push({ role: 'patient', content: `Guest message ${i}: knee has been stiff in the mornings, no swelling, walking fine` });
    last = await chat(m);
    m.push({ role: 'ai', content: last.text.slice(0, 200) || 'ok' });
    if (last.status !== 200) break;
  }
  ok('open beta: 5 guest messages all answered (no account gate)', last.status === 200 && last.text.length > 0, `status=${last.status}`);
  await new Promise((r) => setTimeout(r, 400)); // the counter is fire-and-forget
  const stats = execSync(`psql "${DB}" -qtAc "select coalesce(sum(messages),0) || '|' || coalesce(sum(conversations),0) from beta_chat_stats where day = (now() at time zone 'utc')::date"`).toString().trim();
  const [msgs, convos] = stats.split('|').map(Number);
  ok('open beta: aggregate counter recorded the guest messages (no identifiers stored)', msgs >= 5 && convos >= 1, stats);
  const r = await fetch(BASE + '/api/intake/start', { method: 'POST', headers: { 'content-type': 'application/json', origin: BASE } });
  ok('open beta: starting/saving an intake still requires an account (401)', r.status === 401, String(r.status));
}

// ── 1. forged session cookie does not mint a fresh rate-limit bucket ──
// rlChat is 60/10min per key. Send 61 guest chats with a different forged cookie each time: must 429 by the end.
let last = 0;
for (let i = 0; i < 62; i++) {
  const r = await fetch(BASE + '/api/intake/chat', { method: 'POST', headers: { 'content-type': 'application/json', origin: BASE, cookie: `better-auth.session_token=forged${i}` }, body: JSON.stringify({ messages: [{ role: 'patient', content: 'hello' }] }) });
  last = r.status;
  if (last === 429) break;
}
ok('forged cookies share the IP bucket (429 reached)', last === 429, String(last));

// ── 2. completed intake cannot be re-completed; responses validated ──
const pt = client(); await signup(pt, 'Lock Patient', `lock_pt_${T}@example.test`);
const it = await completeIntake(pt, 'Mild rash on my arm', routine);
ok('first completion ok', it.status === 200, String(it.status));
let r = await pt.j(`/api/intake/${it.id}/complete`, { method: 'POST', body: JSON.stringify({ chiefComplaint: 'CHANGED', responses: [{ questionId: 'q0', question: 'Q', answer: 'changed' }] }) });
ok('re-complete rejected (409)', r.status === 409, String(r.status));
ok('stored complaint unchanged', psql(`select chief_complaint from intake_sessions where id=${it.id}`) === 'Mild rash on my arm');
const st = await pt.j('/api/intake/start', { method: 'POST' });
r = await pt.j(`/api/intake/${st.body.id}/complete`, { method: 'POST', body: JSON.stringify({ chiefComplaint: 'x', responses: [{ questionId: 5, question: 'Q', answer: 'a' }] }) });
ok('malformed response shape → 400', r.status === 400, String(r.status));

// ── 3. profile validation ──
r = await pt.j('/api/patient/profile', { method: 'PUT', body: JSON.stringify({ conditions: 'not-a-list' }) });
ok('profile: string where list expected → 400', r.status === 400, String(r.status));
r = await pt.j('/api/patient/profile', { method: 'PUT', body: JSON.stringify({ phone: 'x'.repeat(40) }) });
ok('profile: overlong phone → 400', r.status === 400, String(r.status));
r = await pt.j('/api/patient/profile', { method: 'PUT', body: JSON.stringify({ dateOfBirth: '1980-01-02', gender: 'female', phone: '7315550100', conditions: ['asthma'], medications: [], allergies: ['penicillin'] }) });
ok('profile: valid → 200', r.status === 200, JSON.stringify(r.body));

// ── 4. check-in can't be re-resolved ──
const vid = psql(`select id from checkins where patient_user_id=(select id from "user" where lower(email)='lock_pt_${T}@example.test') limit 1`);
// (routine intakes earn no check-in; create one directly)
const uid = psql(`select id from "user" where lower(email)='lock_pt_${T}@example.test'`);
const cid = psql(`insert into checkins (intake_session_id, patient_user_id, reason, due_at, status) values (${it.id}, '${uid}', 'post_visit', now(), 'sent') returning id`);
let f1 = await completeIntake(pt, 'Feeling a bit worse', ['worse', 'no', 'no'], { checkinId: Number(cid), outcome: 'worse' });
ok('first follow-up resolves the check-in', f1.status === 200 && f1.body.checkin && f1.body.checkin.escalated === true, JSON.stringify(f1.body.checkin));
let f2 = await completeIntake(pt, 'Still worse', ['worse', 'no', 'no'], { checkinId: Number(cid), outcome: 'worse' });
ok('second follow-up against the same check-in does not re-resolve it', f2.status === 200 && f2.body.checkin === null, JSON.stringify(f2.body.checkin));
ok('check-in still points at the first follow-up', psql(`select followup_intake_id from checkins where id=${cid}`) === String(f1.id));

// ── 5. server-side idle logoff ──
const dr = client(); await signup(dr, 'Dr Idle', `idle_dr_${T}@example.test`);
psql(`update "user" set role='provider' where lower(email)='idle_dr_${T}@example.test'`);
r = await dr.j('/api/dispatch/me'); ok('clinician call ok while active', r.status === 200, String(r.status));
ok('last_active_at stamped', psql(`select count(*) from session where user_id=(select id from "user" where lower(email)='idle_dr_${T}@example.test') and last_active_at is not null`) === '1');
psql(`update session set last_active_at = now() - interval '16 minutes' where user_id=(select id from "user" where lower(email)='idle_dr_${T}@example.test')`);
r = await dr.j('/api/dispatch/me'); ok('16 min idle → 401 idle, session destroyed', r.status === 401 && r.body?.code === 'idle', String(r.status) + ' ' + JSON.stringify(r.body));
ok('session row gone', psql(`select count(*) from session where user_id=(select id from "user" where lower(email)='idle_dr_${T}@example.test')`) === '0');
// patient limit is 30 min: 16 min idle is still fine
psql(`update session set last_active_at = now() - interval '16 minutes' where user_id='${uid}'`);
r = await pt.j('/api/patient/profile'); ok('patient at 16 min idle still signed in (30-min limit)', r.status === 200, String(r.status));
psql(`update session set last_active_at = now() - interval '31 minutes' where user_id='${uid}'`);
r = await pt.j('/api/patient/profile'); ok('patient at 31 min idle → 401 idle', r.status === 401 && r.body?.code === 'idle', String(r.status));

// ── 6. admin endpoints require MFA when REQUIRE_MFA_CLINICIANS is on (checked in mfa suite env; here just auth) ──
const adm = client(); await signup(adm, 'Adm', `hard_adm_${T}@example.test`);
r = await adm.j('/api/admin/audit'); ok('non-admin → 403', r.status === 403, String(r.status));

// ── 7. email templates escape names ──
const { verifyEmailTemplate } = await import('../../src/server/lib/email.ts').catch(() => ({}));
if (verifyEmailTemplate) {
  const t = verifyEmailTemplate('<a href="https://evil.example">click</a>', 'https://acuteinsight.ai/v');
  ok('html name not rendered as markup', !t.html.includes('<a href="https://evil'), t.html.slice(0, 80));
} else console.log('SKIP  email template check (ts import unavailable here; covered by unit test)');

console.log(fails ? `\n${fails} FAILED` : '\nALL PASS');
process.exit(fails ? 1 : 0);
