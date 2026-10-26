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

describe('urgent concerning-symptom scan — red flags the fallback must not call routine', () => {
  const urgent = (cc: string, answers: string[]) =>
    buildTemplateClinicalBrief(cc, answers.map((a, i) => ({ questionId: `q${i}`, question: 'Q', answer: a }))).disposition.level;
  it('fever + flank/back pain + rigors (possible pyelonephritis) → urgent', () => {
    expect(urgent('UTI worse', ['Burning is worse, now I have a fever of 102 and pain in my back on the right side', 'Shaking chills'])).toBe('urgent');
  });
  it('sore throat with swollen neck and trouble swallowing → urgent', () => {
    expect(urgent('Sore throat', ['Sore throat three days, fever 102, hard to swallow and my neck is swollen'])).toBe('urgent');
  });
  it('blood in urine → urgent', () => {
    expect(urgent('Peeing blood', ['There is blood in my urine since this morning'])).toBe('urgent');
  });
  it('plain allergy symptoms stay routine', () => {
    expect(urgent('Allergies', ['Sneezing and itchy eyes for a week', 'No fever, no wheeze'])).not.toBe('urgent');
  });
  it('negated red flags do not trip it', () => {
    expect(urgent('Cold', ['Cough and stuffy nose, no fever, no back pain, no blood in urine'])).not.toBe('urgent');
  });
});
