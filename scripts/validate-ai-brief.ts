/**
 * Run the 108-case triage validation set through the REAL AI brief and write a
 * review report. Needs ANTHROPIC_API_KEY (and ANTHROPIC_WORKSPACE_ID if the key
 * is org-scoped). Skips with a clear message when the key is absent.
 *
 *   ANTHROPIC_API_KEY=sk-ant-… npx tsx scripts/validate-ai-brief.ts [--only E01,U03] [--out report.md]
 *
 * For each case: the AI disposition vs. the expected floor, the deterministic
 * fallback's level, and what production would store (AI, but never below the
 * fallback floor — the same rule as the /complete endpoint). Under-triage by
 * the AI alone is listed first; that is what Will reviews. Costs ~108 Sonnet
 * calls (a few dollars). Synthetic data only — no PHI.
 */
import { writeFileSync } from 'node:fs';
import { aiAvailable, generateClinicalBrief } from '../src/server/lib/ai.js';
import { buildTemplateClinicalBrief } from '../src/server/lib/intake-fallback.js';
import { VALIDATION_SET } from '../src/server/lib/triage-validation-set.js';
import { ACUITY_LEVELS, type Acuity } from '../src/lib/clinical-brief.js';

const rank = (a: string) => ACUITY_LEVELS.indexOf(a as Acuity);
const args = process.argv.slice(2);
// indexOf returns -1 when a flag is absent; -1 + 1 = 0 silently grabbed args[0]
// and filtered the set to nothing (found 2026-10-29 when --out was passed alone).
const onlyIdx = args.indexOf('--only');
const only = onlyIdx >= 0 ? (args[onlyIdx + 1] ?? '').split(',').filter(Boolean) : [];
const outIdx = args.indexOf('--out');
const out = outIdx >= 0 ? (args[outIdx + 1] ?? 'ai-brief-validation.md') : 'ai-brief-validation.md';

if (!aiAvailable()) {
  console.error('ANTHROPIC_API_KEY is not set — nothing to validate. Set it (and ANTHROPIC_WORKSPACE_ID if org-scoped) and re-run.');
  process.exit(2);
}

const cases = only.length ? VALIDATION_SET.filter((c) => only.includes(c.id)) : VALIDATION_SET;
type Row = { id: string; group: string; cc: string; expected: string; ceiling?: string; fallback: string; ai: string | 'ERROR'; stored: string; aiUnder: boolean; aiOver: boolean; storedUnder: boolean; flags: string[]; differential: string; plan: string; err?: string };
const rows: Row[] = [];

for (const c of cases) {
  const responses = c.answers.map((a, i) => ({ questionId: `q${i}`, question: 'Q', answer: a }));
  const fb = buildTemplateClinicalBrief(c.chiefComplaint, responses);
  let ai: Awaited<ReturnType<typeof generateClinicalBrief>> | null = null;
  let err: string | undefined;
  try {
    ai = await generateClinicalBrief(c.chiefComplaint, responses);
  } catch (e) {
    err = e instanceof Error ? e.message : String(e);
  }
  const aiLevel = ai?.disposition.level ?? 'ERROR';
  // Production rule: AI wins only if at-or-above the fallback floor.
  const stored = ai && rank(ai.disposition.level) <= rank(fb.disposition.level) ? ai.disposition.level : fb.disposition.level;
  const row: Row = {
    id: c.id, group: c.group, cc: c.chiefComplaint, expected: c.expected, ceiling: c.mustNotExceed,
    fallback: fb.disposition.level, ai: aiLevel, stored,
    aiUnder: ai ? rank(aiLevel) > rank(c.expected) : false,
    aiOver: ai && c.mustNotExceed ? rank(aiLevel) < rank(c.mustNotExceed) : false,
    storedUnder: rank(stored) > rank(c.expected),
    flags: ai?.flags ?? [],
    differential: ai ? ai.differential.slice(0, 3).map((d) => `${d.condition} (${d.likelihood})`).join('; ') : '',
    plan: ai ? ai.note.plan.slice(0, 2).join(' / ') : '',
    err,
  };
  rows.push(row);
  const mark = row.storedUnder ? 'UNDER(stored!)' : row.aiUnder ? 'under(ai only)' : row.aiOver ? 'over' : 'ok';
  console.log(`${mark.padEnd(15)} ${c.id} expected≥${c.expected}  fallback=${fb.disposition.level}  ai=${aiLevel}  stored=${stored}${err ? '  ERR ' + err.slice(0, 60) : ''}`);
}

const n = rows.length, aiUnder = rows.filter((r) => r.aiUnder), storedUnder = rows.filter((r) => r.storedUnder), over = rows.filter((r) => r.aiOver), errs = rows.filter((r) => r.err);
const md: string[] = [];
md.push(`# AI brief validation — ${new Date().toISOString().slice(0, 10)}\n`);
md.push(`Model: ${process.env.ANTHROPIC_SUMMARY_MODEL ?? 'claude-sonnet-5-5'} · cases: ${n} · AI under-triage (AI alone): **${aiUnder.length}** · would-be-stored under-triage (after the fallback floor): **${storedUnder.length}** · AI over-triage on traps: ${over.length} · errors: ${errs.length}\n`);
md.push(`The fallback floor is what production enforces: the stored disposition is the AI's only when it is at or above the deterministic level. "AI alone" under-triages are the model's judgment calls for Will to read; "stored" under-triages would reach a patient and are bugs.\n`);
const section = (title: string, list: Row[]) => {
  if (!list.length) return;
  md.push(`\n## ${title} (${list.length})\n\n| ID | Case | Expected ≥ | Fallback | AI | Stored | AI differential | AI plan | AI flags |\n|---|---|---|---|---|---|---|---|---|`);
  for (const r of list) md.push(`| ${r.id} | ${r.cc.replace(/\|/g, '\\|')} | ${r.expected}${r.ceiling ? ` (≤ ${r.ceiling})` : ''} | ${r.fallback} | **${r.ai}** | ${r.stored} | ${r.differential.replace(/\|/g, '\\|')} | ${r.plan.replace(/\|/g, '\\|')} | ${r.flags.join('; ').replace(/\|/g, '\\|')} |`);
};
section('Would be stored under-triaged — BUGS', storedUnder);
section('AI alone under-triaged (floor caught it) — review the model\'s reasoning', aiUnder.filter((r) => !r.storedUnder));
section('AI over-triaged a trap', over);
section('Errors', errs);
section('All cases', rows);
writeFileSync(out, md.join('\n') + '\n');
console.log(`\nAI under: ${aiUnder.length}  stored under: ${storedUnder.length}  over: ${over.length}  errors: ${errs.length}  → ${out}`);
process.exit(storedUnder.length ? 1 : 0);
