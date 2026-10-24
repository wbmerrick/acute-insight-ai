import { describe, it, expect } from 'vitest';
import { detectEmergency, buildTemplateClinicalBrief } from './intake-fallback.js';

describe('detectEmergency — fires on the patient’s own current emergency', () => {
  it.each([
    'I am having crushing chest pain right now',
    "I can't breathe and my chest hurts",
    'I think I am having a heart attack',
    'I had a seizure this morning',
    'I have been having thoughts that I want to kill myself',
  ])('fires: %s', (t) => {
    expect(detectEmergency(t)).toBe(true);
  });
});

describe('detectEmergency — suppresses non-current / attributed mentions', () => {
  it.each([
    'My dad had a heart attack at 55',
    'Family history of stroke on my mother’s side',
    'I have a history of heart attack a few years ago',
    'I have a mild headache. No chest pain, no fever.',
    'Denies chest pain or shortness of breath',
  ])('suppresses: %s', (t) => {
    expect(detectEmergency(t)).toBe(false);
  });

  it('still fires when a real symptom accompanies an attributed one', () => {
    expect(detectEmergency('My dad had a heart attack, and now I have chest pain too')).toBe(true);
  });
});

describe('buildTemplateClinicalBrief — conservative triage disposition', () => {
  const brief = (cc: string, answer: string) =>
    buildTemplateClinicalBrief(cc, [{ questionId: 'chat_turn_1', question: 'What brings you in?', answer }]);

  it('emergency for a first-person emergency', () => {
    expect(brief('Chest pain', 'I have crushing chest pain and cannot breathe').disposition.level).toBe('emergency');
  });
  it('urgent for concerning exertional symptoms with family history only', () => {
    expect(brief('Chest tightness', 'Chest tightness on stairs, eases with rest. My dad had a heart attack at 55.').disposition.level).toBe('urgent');
  });
  it('routine for an explicitly negated concern', () => {
    expect(brief('Headache', 'Mild headache for 2 days. No chest pain, no fever.').disposition.level).toBe('routine');
  });
  it('routine for an administrative refill', () => {
    expect(brief('Refill', 'I just need a refill of my lisinopril 10mg').disposition.level).toBe('routine');
  });
  it('always provides a safety-net', () => {
    expect(brief('Headache', 'mild headache').disposition.safetyNet.length).toBeGreaterThan(0);
  });
});
