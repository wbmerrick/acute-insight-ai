#!/usr/bin/env node
/**
 * End-to-end suites against a local dev server + local Postgres.
 *
 *   npm run e2e            # all suites
 *   npm run e2e -- money   # one suite
 *
 * Needs: Postgres at $DATABASE_URL (default postgres://acute:localdev@127.0.0.1:5432/acute_insight,
 * schema applied with `npm run db:push`), port 5173 free. Each suite gets the dev server
 * restarted with the env it needs; Stripe and Resend are stand-ins on 4242/4243 (no real
 * money, no real mail). Suites print PASS/FAIL lines and the runner totals them.
 */
import { spawn, execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://acute:localdev@127.0.0.1:5432/acute_insight';

const base = {
  DATABASE_URL, DB_SSL: 'disable',
  BETTER_AUTH_SECRET: 'localdevsecretlocaldevsecret1234', BETTER_AUTH_URL: 'http://127.0.0.1:5173',
  PUBLIC_BASE_URL: 'http://127.0.0.1:5173', CRON_SECRET: 'cron_stub',
};
const stripe = { STRIPE_SECRET_KEY: 'sk_test_stub', STRIPE_WEBHOOK_SECRET: 'whsec_stub', STRIPE_API_BASE: 'http://127.0.0.1:4242/v1', PRICE_URGENT_CENTS: '7900', PRICE_TELEHEALTH_CENTS: '5900', PRICE_ROUTINE_CENTS: '3900' };

/** suite → env the dev server needs for it */
const SUITES = {
  dispatch:  {},
  companion: {},
  rights:    {},
  hardening: {},
  reauth:    {},
  gatedchat: { BETA_OPEN_CHAT: 'off' },
  payments:  { ...stripe, VISIT_HOLD_HOURS: '0' },
  money:     { ...stripe, VISIT_HOLD_HOURS: '0' },
  payouts:   { ...stripe, VISIT_HOLD_HOURS: '0', STRIPE_CONNECT_ENABLED: 'true', CLINICIAN_PAYOUT_URGENT_CENTS: '5500', CLINICIAN_PAYOUT_TELEHEALTH_CENTS: '4000', CLINICIAN_PAYOUT_ROUTINE_CENTS: '2500' },
  deid:      { ACCOUNT_DELETE_MODE: 'deidentify' },
  scope:     { PROVIDER_SCOPE: 'assigned' },
  mfa:       { REQUIRE_MFA_CLINICIANS: 'true' },
  email:     { RESEND_API_KEY: 're_stub', RESEND_API_BASE: 'http://127.0.0.1:4243', EMAIL_FROM: 'Acute Insight <no-reply@acuteinsight.ai>' },
};

const only = process.argv.slice(2);
const names = only.length ? only : Object.keys(SUITES);
for (const n of names) if (!SUITES[n]) { console.error(`unknown suite ${n}; known: ${Object.keys(SUITES).join(', ')}`); process.exit(2); }

const kids = [];
const start = (cmd, args, env = {}) => { const k = spawn(cmd, args, { cwd: root, env: { ...process.env, ...env }, stdio: 'ignore' }); kids.push(k); return k; };
const stop = async (k) => {
  if (!k || k.exitCode !== null) return;
  k.kill('SIGTERM');
  for (let i = 0; i < 20 && k.exitCode === null; i++) await sleep(100);
  if (k.exitCode === null) k.kill('SIGKILL');
  // wait for the port to free up so the next server doesn't fail --strictPort
  for (let i = 0; i < 40; i++) { try { await fetch('http://127.0.0.1:5173/api/health'); await sleep(250); } catch { return; } }
};
process.on('exit', () => kids.forEach((k) => { try { k.kill('SIGKILL'); } catch {} }));

const up = async (url, tries = 60) => { for (let i = 0; i < tries; i++) { try { if ((await fetch(url)).ok) return true; } catch {} await sleep(500); } return false; };

try { execSync(`psql "${DATABASE_URL}" -qtAc "select 1"`, { stdio: 'ignore' }); } catch { console.error(`Postgres not reachable at ${DATABASE_URL}`); process.exit(2); }

start('node', [path.join(here, 'stripe-stub.mjs')]);
start('node', [path.join(here, 'mail-stub.mjs')]);
if (!(await up('http://127.0.0.1:4242/__calls')) || !(await up('http://127.0.0.1:4243/__sent'))) { console.error('stubs did not start'); process.exit(2); }

let totalPass = 0, totalFail = 0, server = null;
for (const name of names) {
  await stop(server);
  server = start('node', [path.join(root, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '5173', '--strictPort'], { ...base, ...SUITES[name] });
  if (!(await up('http://127.0.0.1:5173/api/health'))) { console.error('dev server did not start'); process.exit(2); }
  const out = await new Promise((resolve) => {
    let buf = ''; const k = spawn('node', [path.join(here, `${name}-e2e.mjs`)], { cwd: root, env: { ...process.env, DATABASE_URL } });
    k.stdout.on('data', (d) => (buf += d)); k.stderr.on('data', (d) => (buf += d)); k.on('close', () => resolve(buf));
  });
  const pass = (out.match(/^PASS/gm) ?? []).length, fail = (out.match(/^FAIL/gm) ?? []).length;
  totalPass += pass; totalFail += fail;
  console.log(`${name.padEnd(10)} pass=${pass} fail=${fail}`);
  if (fail || !pass) console.log(out.split('\n').filter((l) => /^FAIL|Error|error/.test(l)).slice(0, 8).map((l) => '   ' + l).join('\n'));
}
await stop(server);
console.log(`\n${totalFail ? 'FAILED' : 'ALL PASS'}  ${totalPass} passed, ${totalFail} failed`);
process.exit(totalFail ? 1 : 0);
