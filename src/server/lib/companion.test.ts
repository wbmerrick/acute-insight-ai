import { describe, it, expect } from 'vitest';
import { checkinDelayMs, intakeCheckinReason, shouldEscalate, escalationNote } from './companion.js';

describe('companion rules', () => {
  it('schedules by reason', () => {
    expect(checkinDelayMs('post_visit')).toBe(48 * 3600 * 1000);
    expect(checkinDelayMs('urgent_intake')).toBe(24 * 3600 * 1000);
    expect(checkinDelayMs('telehealth_intake')).toBe(48 * 3600 * 1000);
  });
  it('only urgent/telehealth intakes earn an automatic check-in', () => {
    expect(intakeCheckinReason('urgent')).toBe('urgent_intake');
    expect(intakeCheckinReason('telehealth')).toBe('telehealth_intake');
    expect(intakeCheckinReason('routine')).toBeNull();
    expect(intakeCheckinReason('selfcare')).toBeNull();
    expect(intakeCheckinReason('emergency')).toBeNull();
    expect(intakeCheckinReason(undefined)).toBeNull();
  });
  it('escalates on worsening acuity or anything urgent-or-above', () => {
    expect(shouldEscalate('routine', 'urgent')).toBe(true);
    expect(shouldEscalate('routine', 'telehealth')).toBe(true);
    expect(shouldEscalate('urgent', 'urgent')).toBe(true);
    expect(shouldEscalate('urgent', 'emergency')).toBe(true);
    expect(shouldEscalate('routine', 'routine')).toBe(false);
    expect(shouldEscalate('telehealth', 'routine')).toBe(false);
    expect(shouldEscalate('urgent', 'selfcare')).toBe(false);
    expect(shouldEscalate(null, 'routine')).toBe(false);
  });
  it('writes a readable note', () => {
    expect(escalationNote('routine', 'urgent', 'worse')).toBe('Patient reports worse. Follow-up triaged Urgent (was Routine).');
    expect(escalationNote('routine', 'telehealth', 'same')).toBe('Follow-up triaged Telehealth (was Routine).');
  });
});

describe('escalation text', () => {
  it('is PHI-free: date + acuity word + link only', async () => {
    const { escalationText } = await import('./companion.js');
    const t = escalationText('October 26', 'urgent', 'https://acuteinsight.ai');
    expect(t).toBe('Acute Insight: a patient you saw on October 26 reports they are worse. Follow-up triaged Urgent. Review: https://acuteinsight.ai/provider');
    expect(escalationText('October 26', null, 'https://x')).not.toContain('triaged');
  });
});
