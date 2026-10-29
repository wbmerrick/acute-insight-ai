// BETA_OPEN_CHAT=off: the legacy 2-message guest gate still works as the
// escape hatch when the open beta ends. Signed-in users are never gated.
const BASE = 'http://127.0.0.1:5173'; const T = Date.now();
const ok = (l, c, x = '') => console.log(`${c ? 'PASS' : 'FAIL'}  ${l}${x ? '  — ' + x : ''}`);
const chat = async (msgs, cookie = '') => {
  const res = await fetch(BASE + '/api/intake/chat', { method: 'POST', headers: { 'content-type': 'application/json', origin: BASE, ...(cookie ? { cookie } : {}) }, body: JSON.stringify({ messages: msgs }) });
  let body = await res.text();
  return { status: res.status, body };
};
const m1 = [{ role: 'patient', content: 'Knee stiff in the mornings, no swelling' }];
let r = await chat(m1);
ok('gate off-beta: first guest message answered', r.status === 200 && r.body.length > 0, String(r.status));
const m3 = [
  { role: 'patient', content: 'Knee stiff in the mornings' }, { role: 'ai', content: 'How long?' },
  { role: 'patient', content: 'About six weeks' }, { role: 'ai', content: 'Severity?' },
  { role: 'patient', content: 'Maybe a 3 out of 10' },
];
r = await chat(m3);
ok('gate off-beta: third guest message requires an account (401)', r.status === 401 && /account_required/.test(r.body), `${r.status} ${r.body.slice(0, 60)}`);
// Signed-in: unaffected by the gate.
let cookie = '';
const su = await fetch(BASE + '/api/auth/sign-up/email', { method: 'POST', headers: { 'content-type': 'application/json', origin: BASE }, body: JSON.stringify({ name: 'Gated Chat', email: `gated_${T}@example.test`, password: 'Testpass123!' }) });
for (const c of (su.headers.getSetCookie ? su.headers.getSetCookie() : [])) { const kv = c.split(';')[0]; if (!/=;?$/.test(kv)) cookie = cookie ? cookie + '; ' + kv : kv; }
r = await chat(m3, cookie);
ok('gate off-beta: signed-in user chats past the gate', r.status === 200 && r.body.length > 0, String(r.status));
