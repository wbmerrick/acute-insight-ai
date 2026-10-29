import { execSync } from 'child_process';
const BASE = 'http://127.0.0.1:5173'; const DB = process.env.DATABASE_URL ?? 'postgres://acute:localdev@127.0.0.1:5432/acute_insight'; const T = Date.now();
const ok = (l, c, x = '') => console.log(`${c ? 'PASS' : 'FAIL'}  ${l}${x ? '  — ' + x : ''}`);
function client() { let cookie = ''; const cap = (res) => { const sc = res.headers.getSetCookie ? res.headers.getSetCookie() : []; for (const c of sc) { const kv = c.split(';')[0]; const [k] = kv.split('='); const parts = cookie ? cookie.split('; ').filter((p) => !p.startsWith(k + '=')) : []; if (!/=;?$/.test(kv)) parts.push(kv); cookie = parts.join('; '); } }; const j = async (path, opts = {}) => { const res = await fetch(BASE + path, { ...opts, headers: { 'content-type': 'application/json', origin: BASE, referer: BASE + '/', ...(cookie ? { cookie } : {}), ...(opts.headers || {}) } }); cap(res); let body; try { body = await res.json(); } catch { body = null; } return { status: res.status, body }; }; return { j }; }
const sql = (q) => execSync(`psql "${DB}" -qtAc "${q.replace(/"/g, '\\"')}"`).toString().trim();
async function signup(c, name, email) { const r = await c.j('/api/auth/sign-up/email', { method: 'POST', body: JSON.stringify({ name, email, password: 'Testpass123!' }) }); if (r.status !== 200) throw new Error('signup'); return r.body.user.id; }
async function completeIntake(c, cc) { const st = await c.j('/api/intake/start', { method: 'POST' }); await c.j(`/api/intake/${st.body.id}/complete`, { method: 'POST', body: JSON.stringify({ chiefComplaint: cc, responses: [{ questionId: 'q0', question: 'Q', answer: cc }] }) }); return st.body.id; }

const ptA = client(); const ptAId = await signup(ptA, 'Patient A', `scope_a_${T}@example.test`);
const ptB = client(); const ptBId = await signup(ptB, 'Patient B', `scope_b_${T}@example.test`);
const iA = await completeIntake(ptA, 'Scope test A'); const iB = await completeIntake(ptB, 'Scope test B');
const dr = client(); const drEmail = `scope_dr_${T}@example.test`; const drId = await signup(dr, 'Dr Scope', drEmail); sql(`update "user" set role='provider' where lower(email)=lower('${drEmail}')`);
const adm = client(); const admEmail = `scope_adm_${T}@example.test`; await signup(adm, 'Admin Scope', admEmail); sql(`update "user" set role='provider', is_admin=true where lower(email)=lower('${admEmail}')`);

let r = await dr.j('/api/provider/intakes');
ok('unassigned provider sees none of these patients', r.status === 200 && !r.body.some((i) => i.id === iA || i.id === iB), `count=${r.body?.length}`);
r = await adm.j('/api/provider/intakes');
ok('admin sees both', r.body.some((i) => i.id === iA) && r.body.some((i) => i.id === iB));

r = await adm.j('/api/admin/assignments', { method: 'POST', body: JSON.stringify({ providerId: drId, patientId: ptAId }) });
ok('admin assigns patient A to Dr Scope', r.status === 200);
r = await dr.j('/api/provider/intakes');
ok('provider now sees A but not B', r.body.some((i) => i.id === iA) && !r.body.some((i) => i.id === iB));
r = await dr.j('/api/admin/assignments', { method: 'POST', body: JSON.stringify({ providerId: drId, patientId: ptBId }) });
ok('non-admin cannot assign (403)', r.status === 403);
r = await adm.j('/api/admin/assignments', { method: 'POST', body: JSON.stringify({ providerId: ptAId, patientId: ptBId }) });
ok('cannot assign to a non-provider (400)', r.status === 400);

// accepting a dispatched visit grants visibility too
await dr.j('/api/dispatch/me', { method: 'PUT', body: JSON.stringify({ displayName: 'Dr. Scope', credential: 'MD', stateLicenses: ['TN'], maxAcuity: 'urgent', online: true }) });
r = await ptB.j('/api/dispatch/visits', { method: 'POST', body: JSON.stringify({ intakeId: iB, state: 'TN', phone: '731-555-0100' }) });
await dr.j(`/api/dispatch/visits/${r.body.visitId}/accept`, { method: 'POST' });
r = await dr.j('/api/provider/intakes');
ok('accepting B\'s visit makes B visible', r.body.some((i) => i.id === iB));

r = await adm.j('/api/admin/assignments', { method: 'POST', body: JSON.stringify({ providerId: drId, patientId: ptAId, remove: true }) });
r = await dr.j('/api/provider/intakes');
ok('removing the assignment hides A again (B stays via visit)', !r.body.some((i) => i.id === iA) && r.body.some((i) => i.id === iB));
r = await adm.j('/api/admin/assignments');
ok('assignments list + scope reported', r.body.scope === 'assigned' && Array.isArray(r.body.assignments));
