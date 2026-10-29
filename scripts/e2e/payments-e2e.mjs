import { execSync } from 'child_process';
import { createHmac } from 'node:crypto';
const BASE = 'http://127.0.0.1:5173';
const DB = process.env.DATABASE_URL ?? 'postgres://acute:localdev@127.0.0.1:5432/acute_insight';
const T = Date.now();
const ok = (label, cond, extra = '') => console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? '  — ' + extra : ''}`);

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
  if (r.status !== 200) throw new Error('signup ' + r.status);
}
const makeProvider = (email) => execSync(`psql "${DB}" -qtAc "update \\"user\\" set role='provider' where lower(email)=lower('${email}')"`);
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

// pricing endpoint
let r = await fetch(BASE + '/api/dispatch/pricing').then((x) => x.json());
ok('pricing configured + routine $39', r.configured === true && r.routine === 3900 && r.emergency === null, JSON.stringify(r));

const pt = client(); await signup(pt, 'Pay Patient', `pay_pt_${T}@example.test`);
const A = client(); await signup(A, 'Dr Pay', `pay_dr_${T}@example.test`); makeProvider(`pay_dr_${T}@example.test`);
await A.j('/api/dispatch/me', { method: 'PUT', body: JSON.stringify({ displayName: 'Dr. Pay', credential: 'MD', stateLicenses: ['TN'], maxAcuity: 'urgent', online: true }) });

// ── Paid path ──
const i1 = await completeIntake(pt, 'Burning with urination x2 days', ['Burning when I pee for two days', 'No fever no back pain', 'UTI last year']);
r = await pt.j('/api/dispatch/visits', { method: 'POST', body: JSON.stringify({ intakeId: i1.id, state: 'TN', phone: '731-555-0100' }) });
ok(`request on a ${i1.level} intake returns checkoutUrl + pending_payment`, r.status === 200 && r.body.status === 'pending_payment' && /checkout\/cs_test_/.test(r.body.checkoutUrl) && r.body.amountCents === 3900, JSON.stringify(r.body));
const vid = r.body.visitId;
let calls = await stubCalls();
const cs = calls.find((c) => c.url === '/v1/checkout/sessions');
ok('Checkout created with manual capture + visit metadata', cs && /capture_method%5D=manual/.test(cs.body) && new RegExp(`visit_id%5D=${vid}`).test(cs.body) && /unit_amount%5D=3900/.test(cs.body), cs?.body?.slice(0, 120));

let q = await A.j('/api/dispatch/queue');
ok('unpaid visit is NOT in the clinician queue', !q.body.queue.some((v) => v.id === vid));
r = await A.j(`/api/dispatch/visits/${vid}/accept`, { method: 'POST' });
ok('unpaid visit cannot be accepted (409)', r.status === 409);

// re-request returns a fresh checkout url (patient came back)
r = await pt.j('/api/dispatch/visits', { method: 'POST', body: JSON.stringify({ intakeId: i1.id, state: 'TN', phone: '731-555-0100' }) });
ok('re-request while unpaid re-opens checkout', r.body.visitId === vid && !!r.body.checkoutUrl);

// bad signature
let st = await fetch(BASE + '/api/stripe/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=bad' }, body: '{}' }).then((x) => x.status);
ok('webhook rejects bad signature (400)', st === 400);

// card authorized → queued
st = await webhook({ id: 'evt_1', type: 'checkout.session.completed', data: { object: { id: `cs_test_${vid}`, payment_intent: `pi_test_${vid}`, client_reference_id: String(vid), metadata: { visit_id: String(vid) } } } });
ok('webhook completed accepted (200)', st === 200);
r = await pt.j(`/api/dispatch/visits/${vid}`);
ok('visit queued with authorized hold of $39', r.body.status === 'queued' && r.body.paymentStatus === 'authorized' && r.body.amountCents === 3900, JSON.stringify({ s: r.body.status, p: r.body.paymentStatus }));
q = await A.j('/api/dispatch/queue');
ok('paid visit now in clinician queue', q.body.queue.some((v) => v.id === vid));

// accept → capture
r = await A.j(`/api/dispatch/visits/${vid}/accept`, { method: 'POST' });
ok('accept ok', r.status === 200);
calls = await stubCalls();
ok('Stripe capture called on accept', calls.some((c) => c.url === `/v1/payment_intents/pi_test_${vid}/capture`));
r = await pt.j(`/api/dispatch/visits/${vid}`);
ok('payment captured', r.body.paymentStatus === 'captured');
await A.j(`/api/dispatch/visits/${vid}/complete`, { method: 'POST' });

// ── Patient cancels while queued → hold released ──
const i2 = await completeIntake(pt, 'Sore throat x3 days', ['Sore throat three days, fever 101', 'No trouble breathing', 'Healthy']);
r = await pt.j('/api/dispatch/visits', { method: 'POST', body: JSON.stringify({ intakeId: i2.id, state: 'TN', phone: '731-555-0100' }) });
const v2 = r.body.visitId;
await webhook({ id: 'evt_2', type: 'checkout.session.completed', data: { object: { id: `cs_test_${v2}`, payment_intent: `pi_test_${v2}`, client_reference_id: String(v2), metadata: { visit_id: String(v2) } } } });
r = await pt.j(`/api/dispatch/visits/${v2}/cancel`, { method: 'POST' });
ok('patient cancel ok', r.status === 200);
calls = await stubCalls();
ok('Stripe cancel (release) called on patient cancel', calls.some((c) => c.url === `/v1/payment_intents/pi_test_${v2}/cancel`));
r = await pt.j(`/api/dispatch/visits/${v2}`);
ok('visit cancelled, hold released', r.body.status === 'cancelled' && r.body.paymentStatus === 'released');
r = await pt.j(`/api/dispatch/visits/${v2}/cancel`, { method: 'POST' });
ok('cannot cancel twice (409)', r.status === 409);

// ── Sweep releases stale holds (VISIT_HOLD_HOURS=0 → everything queued is stale) ──
const i3 = await completeIntake(pt, 'Rash on arm x1 week', ['Itchy rash on my forearm for a week', 'No fever', 'No new soaps']);
r = await pt.j('/api/dispatch/visits', { method: 'POST', body: JSON.stringify({ intakeId: i3.id, state: 'TN', phone: '731-555-0100' }) });
const v3 = r.body.visitId;
await webhook({ id: 'evt_3', type: 'checkout.session.completed', data: { object: { id: `cs_test_${v3}`, payment_intent: `pi_test_${v3}`, client_reference_id: String(v3), metadata: { visit_id: String(v3) } } } });
st = await fetch(BASE + '/api/dispatch/sweep').then((x) => x.status);
ok('sweep without secret rejected (401)', st === 401);
r = await fetch(BASE + '/api/dispatch/sweep', { headers: { authorization: 'Bearer cron_stub' } }).then((x) => x.json());
ok('sweep cancels stale + releases holds', r.ok && r.cancelled >= 1 && r.released >= 1, JSON.stringify(r));
r = await pt.j(`/api/dispatch/visits/${v3}`);
ok('swept visit cancelled + released', r.body.status === 'cancelled' && r.body.paymentStatus === 'released');

// ── Emergency still refused, even with pricing on ──
const i4 = await completeIntake(pt, 'Crushing chest pain', ['Crushing chest pain right now, sweating, left arm numb']);
r = await pt.j('/api/dispatch/visits', { method: 'POST', body: JSON.stringify({ intakeId: i4.id, state: 'TN', phone: '731-555-0100' }) });
ok('emergency never gets a checkout (409)', r.status === 409 && !r.body.checkoutUrl);
