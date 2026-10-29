import { describe, it, expect } from 'vitest';
import { applyAcuityFloor, coerceClinicalBrief, type ClinicalBrief, type Acuity } from './clinical-brief';
import { buildTemplateClinicalBrief } from '../server/lib/intake-fallback';

function brief(level: Acuity, flags: string[] = [], extra: Partial<ClinicalBrief> = {}): ClinicalBrief {
  return {
    summary: `s-${level}`,
    flags,
    disposition: { level, label: level, timeframe: 't', rationale: 'r', safetyNet: 'sn' },
    note: { plan: ['p'], assessment: 'a', objective: ['o'], hpi: 'h' },
    differential: [],
    workup: [],
    ...extra,
  };
}

describe('applyAcuityFloor — the safety-floor rule as one function', () => {
  it('AI below the floor: floor disposition wins, AI content kept, source=model', () => {
    const floor = brief('urgent', ['deterministic flag']);
    const ai = brief('routine', ['model flag'], { differential: [{ condition: 'UTI', likelihood: 'higher', rationale: '' }] });
    const merged = applyAcuityFloor(floor, ai);
    expect(merged.disposition.level).toBe('urgent'); // never downgraded
    expect(merged.disposition).toBe(floor.disposition); // the deterministic card, verbatim
    expect(merged.differential[0].condition).toBe('UTI'); // AI note survives
    expect(merged.summary).toBe('s-routine');
    expect(merged.source).toBe('model');
  });

  it('AI above the floor: AI raises the disposition', () => {
    const merged = applyAcuityFloor(brief('routine'), brief('emergency'));
    expect(merged.disposition.level).toBe('emergency');
  });

  it('AI equal to the floor: AI disposition (its own wording) is used', () => {
    const floor = brief('urgent');
    const ai = brief('urgent');
    ai.disposition.rationale = 'model rationale';
    expect(applyAcuityFloor(floor, ai).disposition.rationale).toBe('model rationale');
  });

  it('flags from both sides are kept, deduped', () => {
    const merged = applyAcuityFloor(brief('urgent', ['a', 'b']), brief('urgent', ['b', 'c']));
    expect(merged.flags.sort()).toEqual(['a', 'b', 'c']);
  });

  it('every acuity pair respects the floor', () => {
    const order: Acuity[] = ['emergency', 'urgent', 'telehealth', 'routine', 'selfcare'];
    for (const f of order)
      for (const a of order) {
        const level = applyAcuityFloor(brief(f), brief(a)).disposition.level;
        // merged acuity index must be <= floor index (same or higher acuity)
        expect(order.indexOf(level)).toBeLessThanOrEqual(order.indexOf(f));
      }
  });
});

describe('brief source marker', () => {
  it('the deterministic template brief is marked source=fallback', () => {
    const b = buildTemplateClinicalBrief('runny nose', [{ questionId: 'q0', question: 'Q', answer: 'Runny nose two days, no fever' }]);
    expect(b.source).toBe('fallback');
  });

  it('coerceClinicalBrief preserves a valid source and drops an invalid one', () => {
    const base = brief('routine');
    expect(coerceClinicalBrief({ ...base, source: 'model' })?.source).toBe('model');
    expect(coerceClinicalBrief({ ...base, source: 'fallback' })?.source).toBe('fallback');
    expect(coerceClinicalBrief({ ...base, source: 'martian' })?.source).toBeUndefined();
  });
});
