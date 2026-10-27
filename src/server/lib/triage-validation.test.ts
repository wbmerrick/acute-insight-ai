import { describe, it, expect } from 'vitest';
import { buildTemplateClinicalBrief } from './intake-fallback.js';
import { VALIDATION_SET } from './triage-validation-set.js';
import { ACUITY_LEVELS } from '../../lib/clinical-brief.js';

const rank = (a: string) => ACUITY_LEVELS.indexOf(a as never);

/** Every synthetic case: never under-triage; traps never over-triage. Runs on every build. */
describe('triage validation set (54 synthetic intakes)', () => {
  for (const c of VALIDATION_SET) {
    it(`${c.id} ${c.chiefComplaint} → ≥ ${c.expected}${c.mustNotExceed ? ` and ≤ ${c.mustNotExceed}` : ''}`, () => {
      const b = buildTemplateClinicalBrief(c.chiefComplaint, c.answers.map((a, i) => ({ questionId: `q${i}`, question: 'Q', answer: a })));
      const got = b.disposition.level;
      expect(rank(got), `under-triaged: got ${got}`).toBeLessThanOrEqual(rank(c.expected));
      if (c.mustNotExceed) expect(rank(got), `over-triaged: got ${got}`).toBeGreaterThanOrEqual(rank(c.mustNotExceed));
      expect(b.disposition.safetyNet.length).toBeGreaterThan(0);
    });
  }
  it('denied self-harm is flagged for the clinician without the 911 card', () => {
    const b = buildTemplateClinicalBrief('Anxiety', [{ questionId: 'q0', question: 'Q', answer: 'Anxious for a month, no thoughts of hurting myself' }]);
    expect(b.disposition.level).not.toBe('emergency');
    expect(b.flags.some((f) => /self-harm mentioned and denied/i.test(f))).toBe(true);
  });
  it('expressed self-harm fires the emergency path and is flagged', () => {
    const b = buildTemplateClinicalBrief('Hopeless', [{ questionId: 'q0', question: 'Q', answer: "I've been thinking about killing myself" }]);
    expect(b.disposition.level).toBe('emergency');
    expect(b.flags.some((f) => /ideation expressed/i.test(f))).toBe(true);
  });
});
