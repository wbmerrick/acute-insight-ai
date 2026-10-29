import { writeFileSync } from 'fs';
import { execSync } from 'child_process';
const BASE = 'http://127.0.0.1:5173';
const DB = process.env.DATABASE_URL ?? 'postgres://acute:localdev@127.0.0.1:5432/acute_insight';
const T = Date.now();

function client() {
  let cookie = '';
  const cap = (res) => { const sc = res.headers.get('set-cookie'); if (sc) cookie = sc.split(/,(?=[^;]+=)/).map((c) => c.split(';')[0].trim()).join('; '); };
  const j = async (path, opts = {}) => {
    const res = await fetch(BASE + path, { ...opts, headers: { 'content-type': 'application/json', origin: BASE, referer: BASE + '/', ...(cookie ? { cookie } : {}), ...(opts.headers || {}) } });
    cap(res);
    let body; try { body = await res.json(); } catch { body = await res.text(); }
    return { status: res.status, body };
  };
  return { j, cookie: () => cookie };
}
const ok = (label, cond, extra = '') => console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? '  — ' + extra : ''}`);

async function signup(c, name, email) {
  const r = await c.j('/api/auth/sign-up/email', { method: 'POST', body: JSON.stringify({ name, email, password: 'Testpass123!' }) });
  if (r.status !== 200) throw new Error('signup ' + r.status + ' ' + JSON.stringify(r.body));
}
const makeProvider = (email) => execSync(`psql "${DB}" -qtAc "update \\"user\\" set role='provider' where lower(email)=lower('${email}')"`);

// ── Patient completes a non-emergency intake ──
const pt = client();
const ptEmail = `dispatch_pt_${T}@example.test`;
await signup(pt, 'Dispatch Patient', ptEmail);
const st = await pt.j('/api/intake/start', { method: 'POST' });
const intakeId = st.body.id;
const responses = [
  { questionId: 'chat_turn_1', question: 'What brings you in today?', answer: 'Burning when I pee for two days and going a lot more often' },
  { questionId: 'chat_turn_2', question: 'Any fever, back pain, or blood?', answer: 'No fever, no back pain, no blood' },
  { questionId: 'chat_turn_3', question: 'History?', answer: 'Had a UTI last year, no allergies' },
];
const comp = await pt.j(`/api/intake/${intakeId}/complete`, { method: 'POST', body: JSON.stringify({ responses, chiefComplaint: 'Burning with urination x2 days' }) });
console.log('intake disposition:', comp.body?.disposition?.level, '-', comp.body?.disposition?.label);

// Request without state → 400
let r = await pt.j('/api/dispatch/visits', { method: 'POST', body: JSON.stringify({ intakeId }) });
ok('request without state rejected', r.status === 400, r.body?.error);
// Request in TN
r = await pt.j('/api/dispatch/visits', { method: 'POST', body: JSON.stringify({ intakeId, state: 'tn', phone: '731-555-0100' }) });
ok('visit queued', r.status === 200 && r.body.status === 'queued', JSON.stringify(r.body));
const visitId = r.body.visitId;
// Re-request is idempotent
const r2 = await pt.j('/api/dispatch/visits', { method: 'POST', body: JSON.stringify({ intakeId, state: 'TN', phone: '731-555-0100' }) });
ok('re-request returns same visit', r2.body.visitId === visitId);

// ── Emergency intake can never be queued ──
const st2 = await pt.j('/api/intake/start', { method: 'POST' });
await pt.j(`/api/intake/${st2.body.id}/complete`, { method: 'POST', body: JSON.stringify({ chiefComplaint: 'Crushing chest pain', responses: [{ questionId: 'q1', question: 'What brings you in?', answer: 'Crushing chest pain right now, sweating, left arm numb' }] }) });
r = await pt.j('/api/dispatch/visits', { method: 'POST', body: JSON.stringify({ intakeId: st2.body.id, state: 'TN', phone: '731-555-0100' }) });
ok('emergency intake refused from queue (409)', r.status === 409, r.body?.error);

// ── Clinician A: TN, urgent scope ──
const A = client(); const aEmail = `dispatch_drA_${T}@example.test`;
await signup(A, 'Doctor Alpha', aEmail);
r = await A.j('/api/dispatch/me');
ok('patient-role account blocked from dispatch (403)', r.status === 403);
makeProvider(aEmail);
r = await A.j('/api/dispatch/me', { method: 'PUT', body: JSON.stringify({ online: true }) });
ok('cannot go online without a license (400)', r.status === 400, r.body?.error);
r = await A.j('/api/dispatch/me', { method: 'PUT', body: JSON.stringify({ displayName: 'Dr. Alpha', credential: 'DO', stateLicenses: ['TN', 'KY'], maxAcuity: 'urgent', phone: '(731) 555-0199', notifySms: true, online: true }) });
ok('A online in TN/KY with E.164 phone', r.status === 200 && r.body.online === true && r.body.phone === '+17315550199', JSON.stringify(r.body));

// ── Clinician B: TX only ──
const B = client(); const bEmail = `dispatch_drB_${T}@example.test`;
await signup(B, 'Doctor Bravo', bEmail); makeProvider(bEmail);
await B.j('/api/dispatch/me', { method: 'PUT', body: JSON.stringify({ displayName: 'Dr. Bravo', credential: 'NP', stateLicenses: ['TX'], maxAcuity: 'urgent', online: true }) });

// ── Clinician C: TN but routine-only scope ──
const C = client(); const cEmail = `dispatch_drC_${T}@example.test`;
await signup(C, 'Doctor Charlie', cEmail); makeProvider(cEmail);
await C.j('/api/dispatch/me', { method: 'PUT', body: JSON.stringify({ displayName: 'Dr. Charlie', credential: 'PA', stateLicenses: ['TN'], maxAcuity: 'routine', online: true }) });

const qa = await A.j('/api/dispatch/queue');
const qb = await B.j('/api/dispatch/queue');
const qc = await C.j('/api/dispatch/queue');
const inA = qa.body.queue.some((v) => v.id === visitId);
const inB = qb.body.queue.some((v) => v.id === visitId);
const inC = qc.body.queue.some((v) => v.id === visitId);
ok('TN-licensed, urgent-scope clinician sees the visit', inA, JSON.stringify(qa.body.queue.find((v) => v.id === visitId)));
ok('TX-only clinician does NOT see the TN visit', !inB);
const acuity = comp.body?.disposition?.level;
ok(`routine-only clinician ${acuity === 'routine' || acuity === 'selfcare' ? 'sees' : 'does NOT see'} a ${acuity} visit`, (acuity === 'routine' || acuity === 'selfcare') ? inC : !inC);

// patient status while queued
r = await pt.j(`/api/dispatch/visits/${visitId}`);
ok('patient sees queued + online-in-state count', r.body.status === 'queued' && r.body.cliniciansOnlineInState >= 2, `onlineInState=${r.body.cliniciansOnlineInState}`);

// B tries to accept across state line → 403
r = await B.j(`/api/dispatch/visits/${visitId}/accept`, { method: 'POST' });
ok('cross-state accept refused (403)', r.status === 403, r.body?.error);

// A accepts; A again → 409
r = await A.j(`/api/dispatch/visits/${visitId}/accept`, { method: 'POST' });
ok('A accepts', r.status === 200);
r = await A.j(`/api/dispatch/visits/${visitId}/accept`, { method: 'POST' });
ok('second accept refused (409, first-wins)', r.status === 409, r.body?.error);

// A's active view has the brief + phone
const qa2 = await A.j('/api/dispatch/queue');
const act = qa2.body.active.find((v) => v.id === visitId);
ok('A active visit carries brief + phone', !!act?.brief?.note?.plan && act.patientPhone === '731-555-0100', `plan[0]=${act?.brief?.note?.plan?.[0]}`);
ok('visit gone from A queue', !qa2.body.queue.some((v) => v.id === visitId));

// patient sees accepted by Dr. Alpha
r = await pt.j(`/api/dispatch/visits/${visitId}`);
ok('patient sees accepted by Dr. Alpha, DO', r.body.status === 'accepted' && r.body.clinicianName === 'Dr. Alpha' && r.body.clinicianCredential === 'DO');

// release → back in queue → accept again → complete
r = await A.j(`/api/dispatch/visits/${visitId}/release`, { method: 'POST' });
ok('release returns to queue', r.status === 200);
r = await pt.j(`/api/dispatch/visits/${visitId}`);
ok('patient sees queued again', r.body.status === 'queued');
await A.j(`/api/dispatch/visits/${visitId}/accept`, { method: 'POST' });
r = await A.j(`/api/dispatch/visits/${visitId}/complete`, { method: 'POST' });
ok('complete', r.status === 200);
r = await pt.j(`/api/dispatch/visits/${visitId}`);
ok('patient sees completed', r.body.status === 'completed');
const intakes = await pt.j('/api/patient/intakes');
const mine = intakes.body.find((i) => i.id === intakeId);
ok('portal intake stamped with provider name', mine?.providerName === 'Dr. Alpha', mine?.providerName);
ok('portal intake carries visit (completed by Dr. Alpha, DO)', mine?.visit?.status === 'completed' && mine.visit.clinicianName === 'Dr. Alpha' && mine.visit.clinicianCredential === 'DO', JSON.stringify(mine?.visit));

// leave a fresh queued TN visit + A online for screenshots
const st3 = await pt.j('/api/intake/start', { method: 'POST' });
await pt.j(`/api/intake/${st3.body.id}/complete`, { method: 'POST', body: JSON.stringify({ chiefComplaint: 'Sore throat and fever x3 days', responses: [
  { questionId: 'q1', question: 'What brings you in today?', answer: 'Sore throat for three days, fever to 101, hard to swallow' },
  { questionId: 'q2', question: 'Any trouble breathing or drooling?', answer: 'No trouble breathing, no drooling' },
  { questionId: 'q3', question: 'History?', answer: 'Healthy, no meds, penicillin allergy' },
] }) });
const rq = await pt.j('/api/dispatch/visits', { method: 'POST', body: JSON.stringify({ intakeId: st3.body.id, state: 'TN', phone: '731-555-0100' }) });
console.log('screenshot visit:', JSON.stringify(rq.body));
writeFileSync('/tmp/drA-cookie.txt', A.cookie());
writeFileSync('/tmp/pt-cookie.txt', pt.cookie());
writeFileSync('/tmp/dispatch-ids.json', JSON.stringify({ intakeId: st3.body.id, visitId: rq.body.visitId }));
