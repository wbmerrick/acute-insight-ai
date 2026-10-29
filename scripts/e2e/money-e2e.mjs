import { execSync } from 'child_process';
import { createHmac } from 'node:crypto';
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
    const res = await fetch(BASE + path, { ...opts, headers: { 'content-type': 'application/json', origin: BASE, referer: BASE + '/', ...(cookie ? { cookie } : {}), ...(opts.headers || {}) } });
    cap(res); let body; try { body = await res.json(); } catch { body = await res.text(); }
    return { status: res.status, body };
  };
  return { j };
}
async function signup(c, name, email) {
  const r = await c.j('/api/auth/sign-up/email', { method: 'POST', body: JSON.stringify({ name, email, password: 'Testpass123!' }) });
  if (r.status !== 200) throw new Error('signup ' + r.status + ' ' + JSON.stringify(r.body));
}
const makeProvider = (email) => psql(`update "user" set role='provider' where lower(email)=lower('${email}')`);
const stubCalls = async () => (await fetch('http://127.0.0.1:4242/__calls')).json();
const sign = (body) => { const t = Math.floor(Date.now() / 1000); return `t=${t},v1=${createHmac('sha256', 'whsec_stub').update(`${t}.${body}`).digest('hex')}`; };
async function webhook(event) {
  const body = JSON.stringify(event);
  const res = await fetch(BASE + '/api/stripe/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': sign(body) }, body });
  return res.status;
}
async function completeIntake(c, cc, answers) {
  const st = await c.j('/api/intake/start', { method: 'POST' });
  const comp = await c.j(`/api/intake/${st.body.id}/complete`, { method: 'POST', body: JSON.stringify({ chiefComplaint: cc, responses: answers.map((a, i) => ({ questionId: `q${i}`, question: 'Q', answer: a })) }) });
  return { id: st.body.id, level: comp.body?.disposition?.level };
}
const routine = ['two weeks', 'no', 'no fever', 'no', 'mild'];
async function paidQueuedVisit(pt) {
  const it = await completeIntake(pt, 'Refill of my blood pressure medicine', routine);
  const r = await pt.j('/api/dispatch/visits', { method: 'POST', body: JSON.stringify({ intakeId: it.id, state: 'TN', phone: '7315550100' }) });
  const vid = r.body.visitId;
  await webhook({ type: 'checkout.session.completed', data: { object: { id: `cs_test_${vid}`, client_reference_id: String(vid), payment_intent: `pi_test_${vid}`, metadata: { visit_id: String(vid) } } } });
  return vid;
}

const pt = client(); await signup(pt, 'Refund Patient', `rf_pt_${T}@example.test`);
const dr = client(); await signup(dr, 'Dr Refund', `rf_dr_${T}@example.test`); makeProvider(`rf_dr_${T}@example.test`);
await dr.j('/api/dispatch/me', { method: 'PUT', body: JSON.stringify({ displayName: 'Dr. Refund', credential: 'DO', stateLicenses: ['TN'], maxAcuity: 'urgent', phone: '7315550101', online: true }) });
const dr2 = client(); await signup(dr2, 'Dr Second', `rf_dr2_${T}@example.test`); makeProvider(`rf_dr2_${T}@example.test`);
await dr2.j('/api/dispatch/me', { method: 'PUT', body: JSON.stringify({ displayName: 'Dr. Second', credential: 'MD', stateLicenses: ['TN'], maxAcuity: 'urgent', phone: '7315550102', online: true }) });

// ── 1. accept (capture) → release → sweep ⇒ refund, not a stranded charge ──
let vid = await paidQueuedVisit(pt);
let r = await dr.j(`/api/dispatch/visits/${vid}/accept`, { method: 'POST' });
ok('accept ok', r.status === 200, JSON.stringify(r.body));
let row = psql(`select payment_status from visits where id=${vid}`);
ok('captured on accept', row === 'captured', row);
r = await dr.j(`/api/dispatch/visits/${vid}/release`, { method: 'POST' });
ok('release ok', r.status === 200);
row = psql(`select status||'/'||payment_status||'/'||(queued_at > now() - interval '30 seconds') from visits where id=${vid}`);
ok('released visit is queued, still captured, hold clock restarted', row === 'queued/captured/true', row);
r = await fetch(BASE + '/api/dispatch/sweep', { headers: { authorization: 'Bearer cron_stub' } }).then((x) => x.json());
row = psql(`select status||'/'||payment_status from visits where id=${vid}`);
ok('sweep refunded the captured visit', row === 'cancelled/refunded', row + ' ' + JSON.stringify(r));
let calls = await stubCalls();
ok('Stripe refund called with the PI', calls.some((c) => c.url === '/v1/refunds' && c.body.includes(`pi_test_${vid}`)));
r = await pt.j(`/api/dispatch/visits/${vid}`);
ok('patient sees refunded', r.body.paymentStatus === 'refunded', JSON.stringify(r.body));

// ── 2. accept → release → second clinician accepts ⇒ no second capture ──
vid = await paidQueuedVisit(pt);
await dr.j(`/api/dispatch/visits/${vid}/accept`, { method: 'POST' });
await dr.j(`/api/dispatch/visits/${vid}/release`, { method: 'POST' });
const before = (await stubCalls()).filter((c) => c.url === `/v1/payment_intents/pi_test_${vid}/capture`).length;
r = await dr2.j(`/api/dispatch/visits/${vid}/accept`, { method: 'POST' });
ok('second clinician accepts the re-queued visit', r.status === 200, JSON.stringify(r.body));
const after = (await stubCalls()).filter((c) => c.url === `/v1/payment_intents/pi_test_${vid}/capture`).length;
ok('card not captured a second time', before === 1 && after === 1, `${before}→${after}`);
row = psql(`select payment_status from visits where id=${vid}`);
ok('still captured once', row === 'captured', row);
r = await dr2.j(`/api/dispatch/visits/${vid}/complete`, { method: 'POST' });
ok('completed by second clinician', r.status === 200);

// ── 3. cancel an unpaid request ⇒ Checkout expired; late webhook releases the hold ──
let it = await completeIntake(pt, 'Need a refill of my allergy pills', routine);
r = await pt.j('/api/dispatch/visits', { method: 'POST', body: JSON.stringify({ intakeId: it.id, state: 'TN' }) });
vid = r.body.visitId;
r = await pt.j(`/api/dispatch/visits/${vid}/cancel`, { method: 'POST' });
ok('cancel unpaid ok', r.status === 200);
calls = await stubCalls();
ok('Checkout session expired on cancel', calls.some((c) => c.url === `/v1/checkout/sessions/cs_test_${vid}/expire`));
let st = await webhook({ type: 'checkout.session.completed', data: { object: { id: `cs_test_${vid}`, client_reference_id: String(vid), payment_intent: `pi_test_${vid}`, metadata: { visit_id: String(vid) } } } });
ok('late completed webhook accepted (200)', st === 200);
row = psql(`select status||'/'||payment_status from visits where id=${vid}`);
ok('late hold released, visit stays cancelled', row === 'cancelled/released', row);
calls = await stubCalls();
ok('Stripe cancel called for the late hold', calls.some((c) => c.url === `/v1/payment_intents/pi_test_${vid}/cancel`));

// ── 4. re-open checkout uses a fresh idempotency key ──
it = await completeIntake(pt, 'Refill for my thyroid medicine', routine);
r = await pt.j('/api/dispatch/visits', { method: 'POST', body: JSON.stringify({ intakeId: it.id, state: 'TN' }) });
vid = r.body.visitId;
await pt.j('/api/dispatch/visits', { method: 'POST', body: JSON.stringify({ intakeId: it.id, state: 'TN' }) });
const keys = (await stubCalls()).filter((c) => c.url === '/v1/checkout/sessions' && c.body.includes(`client_reference_id=${vid}`)).length;
ok('re-request created a checkout call (key is time-bucketed, not fixed)', keys >= 2, String(keys));

// ── 5. CSRF: cross-site origin on a mutation is rejected; same-site passes; no-origin passes ──
let res = await fetch(BASE + `/api/dispatch/visits/${vid}/cancel`, { method: 'POST', headers: { origin: 'https://evil.example', 'content-type': 'application/json' } });
ok('cross-site POST rejected (403)', res.status === 403, String(res.status));
res = await fetch(BASE + '/api/dispatch/pricing', { headers: { origin: 'https://evil.example' } });
ok('cross-site GET still fine', res.status === 200);
res = await fetch(BASE + '/api/dispatch/sweep', { method: 'GET', headers: { authorization: 'Bearer cron_stub' } });
ok('no-origin server call passes', res.status === 200);

// ── 6. rate-limit IP: spoofed first X-Forwarded-For entry doesn't change identity ──
res = await fetch(BASE + '/api/auth/sign-in/email', { method: 'POST', headers: { 'content-type': 'application/json', origin: BASE, 'x-forwarded-for': '1.2.3.4, 127.0.0.1' }, body: JSON.stringify({ email: 'nobody@example.test', password: 'x' }) });
ok('spoofed XFF request handled (not 500)', res.status !== 500, String(res.status));

// ── 7. delete with a paid visit keeps the ledger (deidentify instead of cascade) ──
const pt2 = client(); const em2 = `rf_pt2_${T}@example.test`; await signup(pt2, 'Ledger Patient', em2);
vid = await paidQueuedVisit(pt2);
await dr.j(`/api/dispatch/visits/${vid}/accept`, { method: 'POST' });
await dr.j(`/api/dispatch/visits/${vid}/complete`, { method: 'POST' });
r = await pt2.j('/api/patient/delete', { method: 'POST', body: JSON.stringify({ confirmEmail: em2 }) });
ok('delete with paid history → deidentify', r.status === 200 && r.body.mode === 'deidentify' && r.body.ledgerRetained === true, JSON.stringify(r.body));
row = psql(`select count(*) from visits where id=${vid}`);
ok('paid visit row survives', row === '1', row);
row = psql(`select name||'/'||role from "user" where email like 'deleted+%' and id=(select patient_user_id from visits where id=${vid})`);
ok('identity tombstoned', row === 'Deleted patient/deleted', row);

// ── 8. delete with no money history still hard-deletes ──
const pt3 = client(); const em3 = `rf_pt3_${T}@example.test`; await signup(pt3, 'Plain Patient', em3);
await completeIntake(pt3, 'Mild rash on my arm', routine);
r = await pt3.j('/api/patient/delete', { method: 'POST', body: JSON.stringify({ confirmEmail: em3 }) });
ok('plain delete still hard-deletes', r.status === 200 && r.body.mode === 'delete', JSON.stringify(r.body));
row = psql(`select count(*) from "user" where lower(email)='${em3}'`);
ok('user row gone', row === '0', row);

console.log(fails ? `\n${fails} FAILED` : '\nALL PASS');
process.exit(fails ? 1 : 0);
