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
  const raw = async (path, opts = {}) => {
    const res = await fetch(BASE + path, { ...opts, headers: { origin: BASE, referer: BASE + '/', ...(cookie ? { cookie } : {}), ...(opts.headers || {}) } });
    cap(res); return res;
  };
  return { j, raw };
}
async function signup(c, name, email) { const r = await c.j('/api/auth/sign-up/email', { method: 'POST', body: JSON.stringify({ name, email, password: 'Testpass123!' }) }); if (r.status !== 200) throw new Error('signup'); }
const makeProvider = (email) => execSync(`psql "${DB}" -qtAc "update \\"user\\" set role='provider' where lower(email)=lower('${email}')"`);
const sign = (body) => { const t = Math.floor(Date.now() / 1000); return `t=${t},v1=${createHmac('sha256', 'whsec_stub').update(`${t}.${body}`).digest('hex')}`; };
const webhook = async (event) => { const body = JSON.stringify(event); return (await fetch(BASE + '/api/stripe/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': sign(body) }, body })).status; };
const stubCalls = async () => (await fetch('http://127.0.0.1:4242/__calls')).json();

const pt = client(); await signup(pt, 'Payout Patient', `po_pt_${T}@example.test`);
const dr = client(); const drEmail = `po_dr_${T}@example.test`; await signup(dr, 'Dr Payout', drEmail); makeProvider(drEmail);
await dr.j('/api/dispatch/me', { method: 'PUT', body: JSON.stringify({ displayName: 'Dr. Payout', credential: 'MD', stateLicenses: ['TN'], maxAcuity: 'urgent', online: true }) });

// earnings: configured, empty
let r = await dr.j('/api/dispatch/earnings');
ok('earnings configured + empty ledger', r.body.configured === true && r.body.connectEnabled === true && r.body.totals.visits === 0, JSON.stringify(r.body.totals));

// paid routine visit → complete → owed $25
const st = await pt.j('/api/intake/start', { method: 'POST' });
await pt.j(`/api/intake/${st.body.id}/complete`, { method: 'POST', body: JSON.stringify({ chiefComplaint: 'Burning with urination x2 days', responses: [{ questionId: 'q0', question: 'Q', answer: 'Burning when I pee for two days' }, { questionId: 'q1', question: 'Q', answer: 'No fever no back pain' }] }) });
r = await pt.j('/api/dispatch/visits', { method: 'POST', body: JSON.stringify({ intakeId: st.body.id, state: 'TN', phone: '731-555-0100' }) });
const vid = r.body.visitId;
await webhook({ id: 'evt_a', type: 'checkout.session.completed', data: { object: { id: `cs_test_${vid}`, payment_intent: `pi_test_${vid}`, client_reference_id: String(vid), metadata: { visit_id: String(vid) } } } });
await dr.j(`/api/dispatch/visits/${vid}/accept`, { method: 'POST' });
r = await dr.j(`/api/dispatch/visits/${vid}/complete`, { method: 'POST' });
ok('complete ok', r.status === 200);
r = await dr.j('/api/dispatch/earnings');
ok('ledger shows $25 owed for the captured routine visit', r.body.totals.owedCents === 2500 && r.body.visits[0]?.payoutStatus === 'owed', JSON.stringify(r.body.totals));

// free (uncaptured) visit earns nothing — simulate by completing a visit whose payment never captured
// (skip: all visits priced here). Instead: sweep must NOT transfer before onboarding
r = await fetch(BASE + '/api/dispatch/sweep', { headers: { authorization: 'Bearer cron_stub' } }).then((x) => x.json());
ok('sweep does not transfer before payout setup', r.transferred === 0, JSON.stringify(r));

// onboarding
r = await dr.j('/api/dispatch/connect/onboard', { method: 'POST' });
ok('onboard returns an account link', r.status === 200 && /onboard\/acct_test_1/.test(r.body.url), JSON.stringify(r.body));
let calls = await stubCalls();
const acct = calls.find((c) => c.url === '/v1/accounts');
ok('Express account created with transfers capability', acct && /type=express/.test(acct.body) && /capabilities%5Btransfers%5D%5Brequested%5D=true/.test(acct.body));
r = await dr.j('/api/dispatch/earnings');
ok('account id stored, payouts not yet enabled', r.body.stripeAccountId === 'acct_test_1' && r.body.payoutsEnabled === false);

// account.updated → enabled → sweep transfers
await webhook({ id: 'evt_b', type: 'account.updated', data: { object: { id: 'acct_test_1', payouts_enabled: true, charges_enabled: true } } });
r = await dr.j('/api/dispatch/earnings');
ok('webhook enables payouts', r.body.payoutsEnabled === true);
r = await fetch(BASE + '/api/dispatch/sweep', { headers: { authorization: 'Bearer cron_stub' } }).then((x) => x.json());
ok('sweep transfers the owed payout', r.transferred === 1, JSON.stringify(r));
calls = await stubCalls();
const tr = calls.find((c) => c.url === '/v1/transfers');
ok('transfer of 2500 to acct_test_1 for the visit', tr && /amount=2500/.test(tr.body) && /destination=acct_test_1/.test(tr.body) && new RegExp(`visit_id%5D=${vid}`).test(tr.body));
r = await dr.j('/api/dispatch/earnings');
ok('ledger: $25 transferred, $0 owed', r.body.totals.transferredCents === 2500 && r.body.totals.owedCents === 0 && r.body.visits[0].payoutStatus === 'transferred');
r = await fetch(BASE + '/api/dispatch/sweep', { headers: { authorization: 'Bearer cron_stub' } }).then((x) => x.json());
ok('second sweep transfers nothing (idempotent)', r.transferred === 0);

// ── statements + accounting (2026-10-29). The e2e database is shared across
// suites, so platform-level sums assert internal consistency and floors, and
// exact figures are asserted on THIS clinician's rows only. ──
const sqlVal = (q) => execSync(`psql "${DB}" -qtAc "${q.replace(/"/g, '\\"')}"`).toString().trim();
const drId = sqlVal(`select id from \"user\" where lower(email)=lower('${drEmail}')`);
const month = new Date().toISOString().slice(0, 7);

let stRes = await dr.raw('/api/dispatch/earnings/statement');
let stText = await stRes.text();
ok('statement: CSV of my visits with totals', stRes.status === 200 && /text\/csv/.test(stRes.headers.get('content-type') || '') && stText.includes(`,${vid},`) && stText.includes('TOTAL transferred (USD),25.00') && stText.includes('TOTAL completed visits,1'), stRes.status + ' ' + (stRes.headers.get('content-type') || ''));
stRes = await dr.raw(`/api/dispatch/earnings/statement?month=${month}`);
ok('statement scoped to the current month still has the visit', (await stRes.text()).includes(`,${vid},`));
stRes = await dr.raw('/api/dispatch/earnings/statement?month=2020-01');
ok('statement for an empty month totals zero', /TOTAL completed visits,0/.test(await stRes.text()));
r = await dr.j('/api/dispatch/earnings/statement?month=nope');
ok('statement rejects a bad month (400)', r.status === 400);

r = await dr.j('/api/admin/accounting');
ok('accounting is admin-only (provider gets 403)', r.status === 403, String(r.status));
const ad = client(); await signup(ad, 'Admin Books', `po_ad_${T}@example.test`);
execSync(`psql "${DB}" -qtAc "update \\"user\\" set is_admin=true, role='provider' where lower(email)=lower('po_ad_${T}@example.test')"`);
r = await ad.j(`/api/admin/accounting?month=${month}`);
const mine = (r.body.byClinician || []).find((c) => c.clinicianUserId === drId);
ok('accounting: my row shows $39 gross, $25 transferred on 1 visit', r.status === 200 && mine && mine.visits === 1 && mine.grossCents === 3900 && mine.transferredCents === 2500 && mine.owedCents === 0, JSON.stringify(mine));
ok('accounting: platform sums are internally consistent and cover this visit',
  r.body.grossCapturedCents >= 3900 && r.body.payoutTransferredCents >= 2500 &&
  r.body.platformMarginCents === r.body.grossCapturedCents - r.body.payoutTotalCents && /not tracked here/.test(r.body.note));
stRes = await ad.raw(`/api/admin/accounting?month=${month}&format=csv`);
const acctCsv = await stRes.text();
ok('accounting CSV carries summary + my clinician row', stRes.status === 200 && /gross_captured_usd,/.test(acctCsv) && new RegExp(`Dr. Payout,${drId},1,39.00,0.00,25.00,0.00`).test(acctCsv));
r = await ad.j('/api/admin/accounting?month=2020-13');
ok('accounting rejects a bad month (400)', r.status === 400);
