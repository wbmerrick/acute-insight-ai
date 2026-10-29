import { execSync } from 'child_process';
const BASE = 'http://127.0.0.1:5173'; const DB = process.env.DATABASE_URL ?? 'postgres://acute:localdev@127.0.0.1:5432/acute_insight'; const T = Date.now();
const ok = (l, c, x = '') => console.log(`${c ? 'PASS' : 'FAIL'}  ${l}${x ? '  — ' + x : ''}`);
function client() { let cookie = ''; const cap = (res) => { const sc = res.headers.getSetCookie ? res.headers.getSetCookie() : []; for (const c of sc) { const kv = c.split(';')[0]; const [k] = kv.split('='); const parts = cookie ? cookie.split('; ').filter((p) => !p.startsWith(k + '=')) : []; if (!/=;?$/.test(kv)) parts.push(kv); cookie = parts.join('; '); } }; const j = async (path, opts = {}) => { const res = await fetch(BASE + path, { ...opts, headers: { 'content-type': 'application/json', origin: BASE, referer: BASE + '/', ...(cookie ? { cookie } : {}), ...(opts.headers || {}) } }); cap(res); let body; try { body = await res.json(); } catch { body = null; } return { status: res.status, body, headers: res.headers }; }; return { j }; }
const sql = (q) => execSync(`psql "${DB}" -qtAc "${q.replace(/"/g, '\\"')}"`).toString().trim();
const pt = client(); const email = `rights_${T}@example.test`;
let r = await pt.j('/api/auth/sign-up/email', { method: 'POST', body: JSON.stringify({ name: 'Rights Patient', email, password: 'Testpass123!' }) });
const uid = r.body.user.id;
const st = await pt.j('/api/intake/start', { method: 'POST' });
await pt.j(`/api/intake/${st.body.id}/complete`, { method: 'POST', body: JSON.stringify({ chiefComplaint: 'Burning with urination', responses: [{ questionId: 'q0', question: 'Q', answer: 'Burning when I pee for two days, no fever' }] }) });
r = await pt.j('/api/dispatch/visits', { method: 'POST', body: JSON.stringify({ intakeId: st.body.id, state: 'TN', phone: '731-555-0100' }) });
const vid = r.body.visitId;

// export
r = await pt.j('/api/patient/export');
ok('export 200 as attachment', r.status === 200 && /attachment/.test(r.headers.get('content-disposition') || ''), r.headers.get('content-disposition'));
ok('export contains account, intake with your answers + brief, visit', r.body.account.email === email && r.body.intakes.length === 1 && r.body.intakes[0].yourAnswers.length === 1 && r.body.intakes[0].brief?.disposition && r.body.visits.length === 1);
ok('export carries the "not a diagnosis" note', /not a diagnosis/.test(r.body.about));

// delete: wrong email
r = await pt.j('/api/patient/delete', { method: 'POST', body: JSON.stringify({ confirmEmail: 'wrong@example.test' }) });
ok('delete refused without exact email (400)', r.status === 400);
// delete: blocked while a clinician has accepted
const dr = client(); const drEmail = `rights_dr_${T}@example.test`; await dr.j('/api/auth/sign-up/email', { method: 'POST', body: JSON.stringify({ name: 'Dr R', email: drEmail, password: 'Testpass123!' }) });
sql(`update "user" set role='provider' where lower(email)=lower('${drEmail}')`);
await dr.j('/api/dispatch/me', { method: 'PUT', body: JSON.stringify({ displayName: 'Dr. R', credential: 'MD', stateLicenses: ['TN'], maxAcuity: 'urgent', online: true }) });
await dr.j(`/api/dispatch/visits/${vid}/accept`, { method: 'POST' });
r = await pt.j('/api/patient/delete', { method: 'POST', body: JSON.stringify({ confirmEmail: email }) });
ok('delete refused while a visit is accepted (409)', r.status === 409, r.body?.error);
await dr.j(`/api/dispatch/visits/${vid}/release`, { method: 'POST' });
// now queued → delete cancels it and removes everything
r = await pt.j('/api/patient/delete', { method: 'POST', body: JSON.stringify({ confirmEmail: email }) });
ok('delete ok', r.status === 200, JSON.stringify(r.body));
ok('user row gone', sql(`select count(*) from "user" where id='${uid}'`) === '0');
ok('intakes gone', sql(`select count(*) from intake_sessions where user_id='${uid}'`) === '0');
ok('visits gone', sql(`select count(*) from visits where patient_user_id='${uid}'`) === '0');
ok('audit rows retained with the patient id', Number(sql(`select count(*) from audit_events where patient_user_id='${uid}'`)) >= 2);
ok('audit has patient.delete + patient.export', sql(`select string_agg(distinct action, ',') from audit_events where patient_user_id='${uid}' and action in ('patient.delete','patient.export')`).includes('patient.delete'));
r = await pt.j('/api/patient/intakes');
ok('session no longer works (401)', r.status === 401, String(r.status));
// clinician cannot self-delete
r = await dr.j('/api/patient/delete', { method: 'POST', body: JSON.stringify({ confirmEmail: drEmail }) });
ok('clinician self-delete refused (409)', r.status === 409);
