/**
 * Synthetic triage validation set — 50 made-up intakes, no real patients.
 *
 * `expected` is the MINIMUM acceptable disposition from the deterministic
 * fallback: the system may triage higher (over-triage is the accepted error)
 * but never lower. `mustNotExceed` marks cases where over-triage would be a
 * real problem (negation / family-history traps) — those must land at or
 * below the stated level. Will reviews and edits the expectations; the file
 * then runs as a regression test on every build.
 */
import type { Acuity } from '../../lib/clinical-brief.js';

export interface ValidationCase {
  id: string;
  group: 'emergency' | 'urgent' | 'telehealth' | 'routine' | 'selfcare' | 'trap';
  chiefComplaint: string;
  answers: string[];
  expected: Acuity;           // minimum acceptable
  mustNotExceed?: Acuity;     // for traps: must not be triaged above this
  note?: string;
}

export const VALIDATION_SET: ValidationCase[] = [
  // ── Emergency (must hit 911 path) ──
  { id: 'E01', group: 'emergency', chiefComplaint: 'Chest pain', answers: ['Crushing chest pain for 20 minutes, sweating, pain going down my left arm'], expected: 'emergency' },
  { id: 'E02', group: 'emergency', chiefComplaint: 'Chest tightness', answers: ['Heavy tightness in the middle of my chest that started an hour ago and will not go away, I feel sick'], expected: 'emergency', note: 'tightness/pressure, not the word "pain"' },
  { id: 'E03', group: 'emergency', chiefComplaint: 'Face drooping', answers: ['My wife says the left side of my face is drooping and my words are slurred, started 30 minutes ago'], expected: 'emergency' },
  { id: 'E04', group: 'emergency', chiefComplaint: 'Trouble breathing', answers: ["I can't catch my breath even sitting still, lips look a little blue"], expected: 'emergency' },
  { id: 'E05', group: 'emergency', chiefComplaint: 'Allergic reaction', answers: ['Ate shrimp, now my lips and tongue are swelling and my throat feels tight'], expected: 'emergency' },
  { id: 'E06', group: 'emergency', chiefComplaint: 'Worst headache', answers: ['Worst headache of my life, came on like a thunderclap 15 minutes ago, neck stiff, vomited'], expected: 'emergency' },
  { id: 'E07', group: 'emergency', chiefComplaint: 'Overdose', answers: ['I took a whole bottle of my pills an hour ago and I feel very drowsy'], expected: 'emergency' },
  { id: 'E08', group: 'emergency', chiefComplaint: 'Feeling hopeless', answers: ["I don't want to be here anymore, I've been thinking about killing myself and I have a plan"], expected: 'emergency', note: 'self-harm — never suppressed' },
  { id: 'E09', group: 'emergency', chiefComplaint: 'Fainted', answers: ['I passed out at work, woke up on the floor, heart is racing and I feel like it might happen again'], expected: 'emergency' },
  { id: 'E10', group: 'emergency', chiefComplaint: 'Vomiting blood', answers: ['Threw up what looked like coffee grounds twice this morning and I feel dizzy standing'], expected: 'emergency' },
  { id: 'E11', group: 'emergency', chiefComplaint: 'Seizure', answers: ['My son just had a seizure that lasted about four minutes and he is not waking up properly'], expected: 'emergency', note: 'caregiver reporting; still emergency' },
  { id: 'E12', group: 'emergency', chiefComplaint: 'Weakness one side', answers: ['Sudden weakness in my right arm and leg, can\'t hold a cup, started during dinner'], expected: 'emergency' },

  // ── Urgent (be seen today) ──
  { id: 'U01', group: 'urgent', chiefComplaint: 'UTI getting worse', answers: ['Burning when I pee for three days, now fever of 102 and pain in my right back, shaking chills'], expected: 'urgent', note: 'possible pyelo' },
  { id: 'U02', group: 'urgent', chiefComplaint: 'Sore throat', answers: ['Sore throat four days, fever 101.5, very hard to swallow, neck is swollen on one side, voice muffled'], expected: 'urgent' },
  { id: 'U03', group: 'urgent', chiefComplaint: 'Abdominal pain', answers: ['Pain started around my belly button yesterday and moved to the lower right, hurts to walk, no appetite, fever 100.8'], expected: 'urgent', note: 'possible appendicitis' },
  { id: 'U04', group: 'urgent', chiefComplaint: 'Blood in urine', answers: ['Urine has been pink to red since this morning, some cramping on the left side'], expected: 'urgent' },
  { id: 'U05', group: 'urgent', chiefComplaint: 'Leg swelling', answers: ['Left calf swollen, warm and painful for two days after a long drive, right leg is fine'], expected: 'urgent', note: 'possible DVT' },
  { id: 'U06', group: 'urgent', chiefComplaint: 'Red streak on arm', answers: ['Cut my hand gardening three days ago, now red and hot with a red streak going up my forearm, fever 100.4'], expected: 'urgent' },
  { id: 'U07', group: 'urgent', chiefComplaint: 'Diabetic, vomiting', answers: ["Type 1 diabetic, vomiting since last night, can't keep fluids down, sugar reads over 400"], expected: 'urgent', note: 'possible DKA — arguably emergency' },
  { id: 'U08', group: 'urgent', chiefComplaint: 'Eye pain', answers: ['Sudden severe pain in my right eye with blurred vision and seeing halos, feel nauseated'], expected: 'urgent', note: 'acute angle closure' },
  { id: 'U09', group: 'urgent', chiefComplaint: 'Testicle pain', answers: ['Sudden severe pain in my left testicle an hour ago, swollen, nauseated'], expected: 'urgent', note: 'torsion — time critical' },
  { id: 'U10', group: 'urgent', chiefComplaint: 'Pregnant, bleeding', answers: ['I am 9 weeks pregnant and started bleeding with cramping this afternoon'], expected: 'urgent' },
  { id: 'U11', group: 'urgent', chiefComplaint: 'Baby fever', answers: ['My 6 week old has a fever of 100.6 and is not feeding well'], expected: 'urgent', note: 'neonatal fever — ED' },
  { id: 'U12', group: 'urgent', chiefComplaint: 'Can\'t pee', answers: ["Haven't been able to urinate for 12 hours, lower belly is tight and painful"], expected: 'urgent' },
  { id: 'U13', group: 'urgent', chiefComplaint: 'Ankle injury', answers: ['Rolled my ankle, heard a pop, can\'t bear weight at all, very swollen and bruised'], expected: 'urgent' },
  { id: 'U14', group: 'urgent', chiefComplaint: 'Asthma flare', answers: ['Asthma acting up, using my inhaler every hour, still wheezing and short of breath walking to the bathroom'], expected: 'urgent' },

  // ── Telehealth (can be handled remotely, soon) ──
  { id: 'T01', group: 'telehealth', chiefComplaint: 'UTI symptoms', answers: ['Burning when I pee for two days, going more often, no fever, no back pain', 'Had a UTI last year, no allergies'], expected: 'routine', note: 'fallback has no telehealth tier logic; routine acceptable, AI should say telehealth' },
  { id: 'T02', group: 'telehealth', chiefComplaint: 'Pink eye', answers: ['Right eye red and goopy for two days, crusted shut this morning, no pain, vision fine'], expected: 'routine' },
  { id: 'T03', group: 'telehealth', chiefComplaint: 'Sinus infection', answers: ['Stuffy nose and face pressure for 10 days, green drainage, low fever 99.8, no trouble breathing'], expected: 'routine' },
  { id: 'T04', group: 'telehealth', chiefComplaint: 'Rash', answers: ['Itchy raised rash on both arms after hiking, no fever, no swelling of my face or trouble breathing'], expected: 'routine' },
  { id: 'T05', group: 'telehealth', chiefComplaint: 'Cough', answers: ['Dry cough for a week after a cold, no fever, no shortness of breath, sleeping okay'], expected: 'routine' },
  { id: 'T06', group: 'telehealth', chiefComplaint: 'Birth control refill', answers: ['Need my birth control refilled, no new problems, no headaches, no leg pain'], expected: 'routine' },
  { id: 'T07', group: 'telehealth', chiefComplaint: 'Acid reflux', answers: ['Burning in my upper stomach after meals for two weeks, better with antacids, no chest pain, no trouble swallowing'], expected: 'routine', mustNotExceed: 'urgent', note: '"burning" + "no chest pain" — negation must hold' },
  { id: 'T08', group: 'telehealth', chiefComplaint: 'Anxiety', answers: ['Feeling anxious and not sleeping well for a month, no thoughts of hurting myself, want to talk about options'], expected: 'routine', mustNotExceed: 'urgent', note: 'negated self-harm — must NOT fire emergency' },
  { id: 'T09', group: 'telehealth', chiefComplaint: 'Ear pain', answers: ['Left ear aching for three days after swimming, no fever, hearing a bit muffled'], expected: 'routine' },
  { id: 'T10', group: 'telehealth', chiefComplaint: 'Yeast infection', answers: ['Itching and thick discharge for four days, no fever, no belly pain, had this before'], expected: 'routine' },

  // ── Routine (scheduled visit) ──
  { id: 'R01', group: 'routine', chiefComplaint: 'Blood pressure follow-up', answers: ['Home readings running 140s over 90s for a month, no headaches, no chest pain, taking lisinopril'], expected: 'routine', mustNotExceed: 'routine' },
  { id: 'R02', group: 'routine', chiefComplaint: 'Knee pain', answers: ['Right knee aches after running for six weeks, no swelling, no locking, can walk fine'], expected: 'routine', mustNotExceed: 'routine' },
  { id: 'R03', group: 'routine', chiefComplaint: 'Annual physical', answers: ['Just need my yearly checkup and labs, feeling fine'], expected: 'routine', mustNotExceed: 'routine' },
  { id: 'R04', group: 'routine', chiefComplaint: 'Mole', answers: ['A mole on my back has gotten a little bigger over the past year, not bleeding, not painful'], expected: 'routine', mustNotExceed: 'routine' },
  { id: 'R05', group: 'routine', chiefComplaint: 'Fatigue', answers: ['Tired for a couple of months, sleeping 7 hours, no weight loss, no fever, no shortness of breath'], expected: 'routine', mustNotExceed: 'routine' },
  { id: 'R06', group: 'routine', chiefComplaint: 'Medication question', answers: ['Metformin is upsetting my stomach, want to ask about switching, sugars are fine'], expected: 'routine', mustNotExceed: 'routine' },
  { id: 'R07', group: 'routine', chiefComplaint: 'Back pain', answers: ['Low back ache for two weeks after yard work, no leg weakness, no numbness, bladder is fine'], expected: 'routine', mustNotExceed: 'routine', note: '"no leg weakness"/"no numbness" — negation of concerning terms' },
  { id: 'R08', group: 'routine', chiefComplaint: 'Headaches', answers: ['Tension headaches a few times a week for a month, mild, respond to ibuprofen, no vision changes, not the worst headache of my life'], expected: 'routine', mustNotExceed: 'routine', note: 'negated "worst headache"' },

  // ── Self-care (fallback has no self-care tier; routine acceptable) ──
  { id: 'S01', group: 'selfcare', chiefComplaint: 'Common cold', answers: ['Runny nose and sneezing for two days, no fever, feel okay otherwise'], expected: 'routine', mustNotExceed: 'routine' },
  { id: 'S02', group: 'selfcare', chiefComplaint: 'Mild sunburn', answers: ['Sunburned shoulders yesterday, red and a little sore, no blisters, no fever'], expected: 'routine', mustNotExceed: 'routine' },
  { id: 'S03', group: 'selfcare', chiefComplaint: 'Sore muscles', answers: ['Legs sore after my first gym session in a year, no swelling, no injury'], expected: 'routine', mustNotExceed: 'routine' },
  { id: 'S04', group: 'selfcare', chiefComplaint: 'Seasonal allergies', answers: ['Itchy eyes and sneezing every spring, no wheeze, no fever'], expected: 'routine', mustNotExceed: 'routine' },

  // ── Traps: must NOT over-triage to emergency ──
  { id: 'X01', group: 'trap', chiefComplaint: 'Exertional chest tightness', answers: ['Chest tightness when I walk up stairs, goes into my left arm, short of breath with it', 'No, I feel okay at rest', 'High blood pressure and high cholesterol, my dad had a heart attack at 55, I used to smoke'], expected: 'urgent', note: 'family history of MI must not fire 911; exertional symptoms must be urgent' },
  { id: 'X02', group: 'trap', chiefComplaint: 'Cough', answers: ['Cough for a week, no chest pain, no trouble breathing, no fever'], expected: 'routine', mustNotExceed: 'routine', note: 'negated chest pain + breathing' },
  { id: 'X03', group: 'trap', chiefComplaint: 'Follow-up after stroke', answers: ['I had a stroke two years ago, fully recovered, just need my blood thinner refilled, no new weakness or speech trouble'], expected: 'routine', mustNotExceed: 'urgent', note: 'past-history "stroke" must not fire 911' },
  { id: 'X04', group: 'trap', chiefComplaint: 'Family history question', answers: ['My mother had a heart attack and my sister has seizures, I want to know what screening I should get, I feel fine'], expected: 'routine', mustNotExceed: 'urgent', note: 'family history only' },
  { id: 'X05', group: 'trap', chiefComplaint: 'Grief', answers: ['My father died last month, I am sad and not sleeping, I am not suicidal and have no thoughts of hurting myself'], expected: 'routine', mustNotExceed: 'urgent', note: 'negated self-harm' },
  { id: 'X06', group: 'trap', chiefComplaint: 'Medication list', answers: ['Taking an EpiPen for a peanut allergy — never had to use it — and a daily inhaler, just updating my records'], expected: 'routine', mustNotExceed: 'urgent', note: 'anaphylaxis device mentioned, no reaction' },
];
