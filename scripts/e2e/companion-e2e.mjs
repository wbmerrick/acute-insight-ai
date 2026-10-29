import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
const BASE = 'http://127.0.0.1:5173';
const DB = process.env.DATABASE_URL ?? 'postgres://acute:localdev@127.0.0.1:5432/acute_insight';
const T = Date.now();
const ok = (label, cond, extra = '') => console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? '  — ' + extra : ''}`);
const sql = (q) => execSync(`psql "${DB}" -qtAc "${q.replace(/"/g, '\\"')}"`).toString().trim();

function client() {
  let cookie = '';
  const cap = (res) => { const sc = res.headers.get('set-cookie'); if (sc) cookie = sc.split(/,(?=[^;]+=)/).map((c) => c.split(';')[0].trim()).join('; '); };
  const j = async (path, opts = {}) => {
    const res = await fetch(BASE + path, { ...opts, headers: { 'content-type': 'application/json', origin: BASE, referer: BASE + '/', ...(cookie ? { cookie } : {}), ...(opts.headers || {}) } });
    cap(res); let body; try { body = await res.json(); } catch { body = await res.text(); }
    return { status: res.status, body };
  };
  return { j, cookie: () => cookie };
}
async function signup(c, name, email) {
  const r = await c.j('/api/auth/sign-up/email', { method: 'POST', body: JSON.stringify({ name, email, password: 'Testpass123!' }) });
  if (r.status !== 200) throw new Error('signup ' + r.status);
}
async function completeIntake(c, cc, answers, extra = {}) {
  const st = await c.j('/api/intake/start', { method: 'POST' });
  const comp = await c.j(`/api/intake/${st.body.id}/complete`, { method: 'POST', body: JSON.stringify({ chiefComplaint: cc, responses: answers.map((a, i) => ({ questionId: `q${i}`, question: 'Q', answer: a })), ...extra }) });
  return { id: st.body.id, level: comp.body?.disposition?.level, checkin: comp.body?.checkin, status: comp.status };
}

const pt = client(); const ptEmail = `comp_pt_${T}@example.test`; await signup(pt, 'Companion Patient', ptEmail);
const dr = client(); const drEmail = `comp_dr_${T}@example.test`; await signup(dr, 'Dr Follow', drEmail);
sql(`update "user" set role='provider' where lower(email)=lower('${drEmail}')`);
await dr.j('/api/dispatch/me', { method: 'PUT', body: JSON.stringify({ displayName: 'Dr. Follow', credential: 'DO', stateLicenses: ['TN'], maxAcuity: 'urgent', online: true }) });

// ── 1. urgent intake with no visit → 24h check-in scheduled ──
const u = await completeIntake(pt, 'Sore throat, fever, hard to swallow', ['Sore throat three days, fever 102, hard to swallow, neck is swollen', 'No trouble breathing', 'Healthy']);
console.log('urgent-ish intake level:', u.level);
let rows = sql(`select reason, status, round(extract(epoch from (due_at - created_at))/3600) from checkins where intake_session_id=${u.id}`);
if (u.level === 'urgent') ok('urgent intake schedules a 24h check-in', rows === 'urgent_intake|scheduled|24', rows);
else if (u.level === 'telehealth') ok('telehealth intake schedules a 48h check-in', rows === 'telehealth_intake|scheduled|48', rows);
else ok(`${u.level} intake schedules no check-in`, rows === '', rows);

// ── 2. routine visit → completed by clinician → 48h post-visit check-in (replacing any pending) ──
const v = await completeIntake(pt, 'Burning with urination x2 days', ['Burning when I pee for two days', 'No fever no back pain', 'UTI last year']);
let r = await pt.j('/api/dispatch/visits', { method: 'POST', body: JSON.stringify({ intakeId: v.id, state: 'TN', phone: '731-555-0100' }) });
const visitId = r.body.visitId;
await dr.j(`/api/dispatch/visits/${visitId}/accept`, { method: 'POST' });
r = await dr.j(`/api/dispatch/visits/${visitId}/complete`, { method: 'POST' });
ok('visit completed', r.status === 200);
rows = sql(`select reason, status, round(extract(epoch from (due_at - created_at))/3600) from checkins where intake_session_id=${v.id} order by id desc limit 1`);
ok('post-visit check-in scheduled 48h out', rows === 'post_visit|scheduled|48', rows);

// nothing pending yet
r = await pt.j('/api/companion/checkins');
ok('nothing pending before due', r.body.pending === null, JSON.stringify(r.body.pending));

// ── 3. make it due, run the cron ──
sql(`update checkins set due_at = now() - interval '1 hour' where intake_session_id=${v.id}`);
let st = await fetch(BASE + '/api/companion/run').then((x) => x.status);
ok('companion run without secret rejected (401)', st === 401);
r = await fetch(BASE + '/api/companion/run', { headers: { authorization: 'Bearer cron_stub' } }).then((x) => x.json());
ok('cron marks due check-in sent', r.ok && r.sent >= 1, JSON.stringify(r));
r = await pt.j('/api/companion/checkins');
const pending = r.body.pending;
ok('patient now has a pending check-in with context', pending && pending.status === 'sent' && pending.chiefComplaint === 'Burning with urination x2 days' && pending.providerName === 'Dr. Follow', JSON.stringify(pending));

// ── 4. patient answers "worse" → escalated immediately; follow-up intake links + escalates ──
r = await pt.j(`/api/companion/checkins/${pending.id}/answer`, { method: 'POST', body: JSON.stringify({ outcome: 'nope' }) });
ok('bad outcome rejected (400)', r.status === 400);
r = await pt.j(`/api/companion/checkins/${pending.id}/answer`, { method: 'POST', body: JSON.stringify({ outcome: 'worse' }) });
ok('worse → escalated at once', r.status === 200 && r.body.status === 'escalated', JSON.stringify(r.body));
const f = await completeIntake(pt, 'Checking in: burning with urination, now worse', ['Burning is worse, now I have a fever of 102 and pain in my back on the right side', 'Shaking chills', 'UTI last year'], { checkinId: pending.id, outcome: 'worse' });
ok('follow-up intake links to check-in and escalates', f.status === 200 && f.checkin && f.checkin.escalated === true, JSON.stringify(f.checkin));
rows = sql(`select status, outcome, followup_intake_id, escalation_note from checkins where id=${pending.id}`);
ok('check-in row: escalated, worse, linked, note', rows.startsWith(`escalated|worse|${f.id}|Patient reports worse.`), rows);

// ── 5. provider sees it, acknowledges, it clears ──
r = await dr.j('/api/provider/checkins');
const esc = r.body.find((x) => x.id === pending.id);
ok('provider needs-attention list has the escalation', !!esc && esc.patientName === 'Companion Patient' && esc.providerName === 'Dr. Follow', JSON.stringify(esc));
r = await dr.j(`/api/provider/checkins/${pending.id}/acknowledge`, { method: 'POST' });
ok('acknowledge ok', r.status === 200);
r = await dr.j('/api/provider/checkins');
ok('cleared after acknowledge', !r.body.some((x) => x.id === pending.id));
r = await dr.j(`/api/provider/checkins/${pending.id}/acknowledge`, { method: 'POST' });
ok('cannot acknowledge twice (404)', r.status === 404);

// ── 6. "better" closes the loop with no escalation ──
const v2 = await completeIntake(pt, 'Rash on arm x1 week', ['Itchy rash on my forearm for a week', 'No fever', 'No new soaps']);
r = await pt.j('/api/dispatch/visits', { method: 'POST', body: JSON.stringify({ intakeId: v2.id, state: 'TN', phone: '731-555-0100' }) });
await dr.j(`/api/dispatch/visits/${r.body.visitId}/accept`, { method: 'POST' });
await dr.j(`/api/dispatch/visits/${r.body.visitId}/complete`, { method: 'POST' });
sql(`update checkins set due_at = now() - interval '1 hour' where intake_session_id=${v2.id}`);
await fetch(BASE + '/api/companion/run', { headers: { authorization: 'Bearer cron_stub' } });
r = await pt.j('/api/companion/checkins');
const p2 = r.body.pending;
r = await pt.j(`/api/companion/checkins/${p2.id}/answer`, { method: 'POST', body: JSON.stringify({ outcome: 'better' }) });
ok('better → answered, not escalated', r.body.status === 'answered');
r = await pt.j('/api/companion/checkins');
ok('no pending after answering', r.body.pending === null);
r = await dr.j('/api/provider/checkins');
ok('no escalation from "better"', !r.body.some((x) => x.id === p2.id));

// ── 7. "same" + follow-up that stays routine → answered, not escalated ──
const v3 = await completeIntake(pt, 'Mild seasonal allergies', ['Sneezing and itchy eyes for a week', 'No fever, no wheeze', 'Healthy']);
console.log('allergy intake level:', v3.level);
if (v3.level === 'urgent' || v3.level === 'telehealth') {
  sql(`update checkins set due_at = now() - interval '1 hour' where intake_session_id=${v3.id}`);
  await fetch(BASE + '/api/companion/run', { headers: { authorization: 'Bearer cron_stub' } });
  r = await pt.j('/api/companion/checkins'); const p3 = r.body.pending;
  await pt.j(`/api/companion/checkins/${p3.id}/answer`, { method: 'POST', body: JSON.stringify({ outcome: 'same' }) });
  const f3 = await completeIntake(pt, 'Checking in: allergies about the same', ['Still sneezing, itchy eyes, no fever', 'No wheeze', 'Healthy'], { checkinId: p3.id, outcome: 'same' });
  ok('same + non-worsening follow-up → not escalated', f3.checkin && f3.checkin.escalated === false, JSON.stringify(f3.checkin));
}

// leave a pending check-in for screenshots
const v4 = await completeIntake(pt, 'Cough and congestion x5 days', ['Cough and stuffy nose for five days, low fever 100.2', 'No trouble breathing', 'Healthy']);
r = await pt.j('/api/dispatch/visits', { method: 'POST', body: JSON.stringify({ intakeId: v4.id, state: 'TN', phone: '731-555-0100' }) });
await dr.j(`/api/dispatch/visits/${r.body.visitId}/accept`, { method: 'POST' });
await dr.j(`/api/dispatch/visits/${r.body.visitId}/complete`, { method: 'POST' });
sql(`update checkins set due_at = now() - interval '1 hour' where intake_session_id=${v4.id}`);
await fetch(BASE + '/api/companion/run', { headers: { authorization: 'Bearer cron_stub' } });
// and a fresh unacknowledged escalation for the provider screenshot
sql(`update checkins set acknowledged_at=null, acknowledged_by=null where id=${pending.id}`);
writeFileSync('/tmp/pt-cookie.txt', pt.cookie());
writeFileSync('/tmp/dr-cookie.txt', dr.cookie());
