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
  group: 'emergency' | 'urgent' | 'telehealth' | 'routine' | 'selfcare' | 'trap' | 'peds' | 'ob' | 'psych' | 'geriatric' | 'messy' | 'spanish' | 'voice' | 'special' | 'review4' | 'longform' | 'minimize' | 'arabic' | 'vietnamese';
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

  // ── Round 2 (2026-10-27) ──
  // Pediatrics (caregiver reporting)
  { id: 'P01', group: 'peds', chiefComplaint: 'Toddler breathing', answers: ['My 2 year old has a barking cough and is making a high pitched noise when she breathes in, pulling in at her ribs'], expected: 'emergency', note: 'stridor + retractions' },
  { id: 'P02', group: 'peds', chiefComplaint: 'Child vomiting', answers: ['My 4 year old has been vomiting all day, no wet diaper in 10 hours, very sleepy and hard to wake'], expected: 'emergency', note: 'dehydration + lethargy' },
  { id: 'P03', group: 'peds', chiefComplaint: 'Head bump', answers: ['My 7 year old fell off the monkey bars, hit his head, has thrown up twice and seems confused'], expected: 'emergency' },
  { id: 'P04', group: 'peds', chiefComplaint: 'Rash with fever', answers: ['My 3 year old has a fever of 103 and a purple spotty rash that does not fade when I press a glass on it'], expected: 'emergency', note: 'non-blanching rash' },
  { id: 'P05', group: 'peds', chiefComplaint: 'Ear infection', answers: ['My 5 year old has been tugging her ear and had a fever of 101 last night, eating and drinking fine, playing today'], expected: 'routine', mustNotExceed: 'urgent' },
  { id: 'P06', group: 'peds', chiefComplaint: 'Swallowed something', answers: ['My toddler swallowed a button battery about an hour ago, seems fine right now'], expected: 'emergency', note: 'button battery = ED now even if asymptomatic' },
  { id: 'P07', group: 'peds', chiefComplaint: 'Fever', answers: ['My 10 year old has had a fever of 101 for two days with a sore throat, drinking fine, no stiff neck, no rash'], expected: 'routine', mustNotExceed: 'urgent' },

  // Obstetrics
  { id: 'O01', group: 'ob', chiefComplaint: 'Pregnant, headache', answers: ['I am 34 weeks pregnant with a bad headache, seeing spots, and my hands and face are swollen'], expected: 'emergency', note: 'preeclampsia' },
  { id: 'O02', group: 'ob', chiefComplaint: 'Baby not moving', answers: ['32 weeks pregnant and I have not felt the baby move since this morning, usually very active'], expected: 'urgent', note: 'decreased fetal movement → L&D now' },
  { id: 'O03', group: 'ob', chiefComplaint: 'Pregnant, bleeding', answers: ['36 weeks pregnant, bright red bleeding that soaked a pad in an hour, no pain'], expected: 'emergency' },
  { id: 'O04', group: 'ob', chiefComplaint: 'Morning sickness', answers: ['8 weeks pregnant, nauseated every morning, keeping fluids down, no bleeding, no pain'], expected: 'routine', mustNotExceed: 'urgent' },
  { id: 'O05', group: 'ob', chiefComplaint: 'Postpartum', answers: ['Had my baby 10 days ago, now fever of 101.5, foul smelling discharge and belly pain'], expected: 'urgent', note: 'endometritis' },
  { id: 'O06', group: 'ob', chiefComplaint: 'Postpartum mood', answers: ['Baby is 3 weeks old and I feel like I am a terrible mother, I keep thinking everyone would be better off without me'], expected: 'emergency', note: 'passive SI postpartum' },

  // Psychiatric
  { id: 'M01', group: 'psych', chiefComplaint: 'Hearing voices', answers: ['The voices started telling me to hurt my roommate and I am scared I might do it'], expected: 'emergency', note: 'command hallucinations, harm to others' },
  { id: 'M02', group: 'psych', chiefComplaint: 'Panic', answers: ['Had a panic attack this morning, heart racing and shaky, it passed in 20 minutes, no chest pain now, have had these before'], expected: 'routine', mustNotExceed: 'urgent' },
  { id: 'M03', group: 'psych', chiefComplaint: 'Not sleeping', answers: ["Haven't slept in four days, have so much energy, spent my savings yesterday, my family says I am not making sense"], expected: 'urgent', note: 'mania' },
  { id: 'M04', group: 'psych', chiefComplaint: 'Drinking', answers: ['Stopped drinking two days ago after years of heavy use, now shaking, sweating, and I saw bugs on the wall that were not there'], expected: 'emergency', note: 'withdrawal with hallucinations' },
  { id: 'M05', group: 'psych', chiefComplaint: 'Low mood', answers: ['Feeling down for a few weeks, still going to work, no thoughts of ending my life, want to talk to someone'], expected: 'routine', mustNotExceed: 'urgent', note: 'denied SI phrasing variant' },

  // Geriatric atypicals
  { id: 'G01', group: 'geriatric', chiefComplaint: 'Confused', answers: ['My 82 year old mother is suddenly confused since this morning, does not know what day it is, she was fine yesterday'], expected: 'urgent', note: 'acute delirium — arguably ED' },
  { id: 'G02', group: 'geriatric', chiefComplaint: 'Fall', answers: ['My 78 year old father fell in the bathroom, now can\'t put weight on his right leg and it looks shorter and turned out'], expected: 'emergency', note: 'hip fracture' },
  { id: 'G03', group: 'geriatric', chiefComplaint: 'Just tired', answers: ['I am 75, very weak and short of breath for a day, nauseated, no chest pain, I am diabetic'], expected: 'urgent', note: 'silent MI pattern; "no chest pain" must not hide it' },
  { id: 'G04', group: 'geriatric', chiefComplaint: 'Fall, on blood thinner', answers: ['I am 80 and on warfarin, I fell and hit my head two hours ago, small bump, feel okay'], expected: 'urgent', note: 'anticoagulated head injury → CT' },
  { id: 'G05', group: 'geriatric', chiefComplaint: 'Knee', answers: ['I am 70, my knee has been stiff in the mornings for months, no swelling, no fever, walking fine'], expected: 'routine', mustNotExceed: 'routine' },

  // Messy input: misspellings, no punctuation, texting style, late red flag
  { id: 'W01', group: 'messy', chiefComplaint: 'chest', answers: ['chest hurts real bad cant breath good sweating'], expected: 'emergency', note: '"cant breath" misspelling' },
  { id: 'W02', group: 'messy', chiefComplaint: 'headach', answers: ['worse headach of my life came on all the sudden'], expected: 'emergency', note: 'worse/worst misspelling' },
  { id: 'W03', group: 'messy', chiefComplaint: 'stroke?', answers: ['my husbands face is droppy on one side and hes talking funny'], expected: 'emergency', note: '"droppy", "talking funny"' },
  { id: 'W04', group: 'messy', chiefComplaint: 'sick', answers: ['been sick 3 days', 'fever and cough', 'yeah kinda hard to breathe laying down and my lips look kinda blue my wife says'], expected: 'emergency', note: 'red flag in turn 3' },
  { id: 'W05', group: 'messy', chiefComplaint: 'stomach', answers: ['stomach ache since yesterday', 'now its in my lower right side and i cant stand up straight', 'temp 101'], expected: 'urgent', note: 'appendicitis across turns' },
  { id: 'W06', group: 'messy', chiefComplaint: 'cold', answers: ['got a cold', 'runny nose sneezing', 'no fever no trouble breathing feel ok'], expected: 'routine', mustNotExceed: 'routine' },
  { id: 'W07', group: 'messy', chiefComplaint: 'allergic', answers: ['took amoxicillin an hour ago now hives everywhere and my toung feels thick'], expected: 'emergency', note: '"toung"' },
  { id: 'W08', group: 'messy', chiefComplaint: 'sucide', answers: ['i want to kill my self'], expected: 'emergency', note: '"kill my self" with a space' },

  // ── Round 3 (2026-10-27) ──
  // Spanish (West TN has a real Spanish-speaking population; the regex screen must at least catch emergencies)
  { id: 'ES01', group: 'spanish', chiefComplaint: 'dolor', answers: ['Tengo un dolor fuerte en el pecho desde hace una hora y me cuesta respirar'], expected: 'emergency' },
  { id: 'ES02', group: 'spanish', chiefComplaint: 'no puedo respirar', answers: ['No puedo respirar bien, los labios se me ponen morados'], expected: 'emergency' },
  { id: 'ES03', group: 'spanish', chiefComplaint: 'derrame', answers: ['A mi esposo se le cayó la cara de un lado y habla raro, empezó hace media hora'], expected: 'emergency', note: 'stroke in Spanish' },
  { id: 'ES04', group: 'spanish', chiefComplaint: 'quiero morir', answers: ['Ya no quiero vivir, he pensado en quitarme la vida'], expected: 'emergency', note: 'self-harm in Spanish' },
  { id: 'ES05', group: 'spanish', chiefComplaint: 'convulsión', answers: ['Mi hijo tuvo una convulsión y no despierta bien'], expected: 'emergency' },
  { id: 'ES06', group: 'spanish', chiefComplaint: 'infección de orina', answers: ['Me arde al orinar desde hace dos días, sin fiebre, sin dolor de espalda'], expected: 'routine', mustNotExceed: 'urgent', note: 'negated in Spanish — must not over-fire' },
  { id: 'ES07', group: 'spanish', chiefComplaint: 'fiebre y dolor de espalda', answers: ['Fiebre de 39 y dolor en la espalda del lado derecho con escalofríos'], expected: 'urgent', note: 'pyelo in Spanish' },
  { id: 'ES08', group: 'spanish', chiefComplaint: 'gripe', answers: ['Tengo gripe, mocos y estornudos, sin fiebre, me siento bien'], expected: 'routine', mustNotExceed: 'routine' },

  // Voice-transcription artifacts (what speech-to-text actually produces)
  { id: 'V01', group: 'voice', chiefComplaint: 'chest pane', answers: ['I have chest pane and I am short of breadth it started twenty minutes ago'], expected: 'emergency', note: '"pane", "breadth"' },
  { id: 'V02', group: 'voice', chiefComplaint: 'cant breath', answers: ['I cant breath right my chest is tight'], expected: 'emergency' },
  { id: 'V03', group: 'voice', chiefComplaint: 'passed out', answers: ['I past out in the kitchen and hit my head'], expected: 'emergency', note: '"past out"' },
  { id: 'V04', group: 'voice', chiefComplaint: 'throat', answers: ['my throat is closing up after I ate peanuts'], expected: 'emergency' },
  { id: 'V05', group: 'voice', chiefComplaint: 'sore throat', answers: ['soar throat for three days no fever swallowing is fine'], expected: 'routine', mustNotExceed: 'routine', note: '"soar"' },

  // Sepsis / infection without a single red-flag word
  { id: 'SP01', group: 'special', chiefComplaint: 'Feeling awful', answers: ['Fever of 103, heart racing, shaking, feel terrible and confused, had a kidney infection last week'], expected: 'urgent', note: 'sepsis picture — arguably emergency' },
  { id: 'SP02', group: 'special', chiefComplaint: 'Chemo, fever', answers: ['I am on chemotherapy and have a fever of 100.9 tonight'], expected: 'urgent', note: 'neutropenic fever → ED' },
  { id: 'SP03', group: 'special', chiefComplaint: 'Transplant, fever', answers: ['Kidney transplant two years ago, fever of 101 and chills today'], expected: 'urgent' },
  { id: 'SP04', group: 'special', chiefComplaint: 'Missed dialysis', answers: ['Missed my last two dialysis sessions, now short of breath lying down and my legs are swollen'], expected: 'urgent', note: 'volume overload / hyperkalemia risk — arguably emergency' },
  { id: 'SP05', group: 'special', chiefComplaint: 'Diabetic foot', answers: ['Diabetic, a sore on the bottom of my foot has turned black and smells bad, some fever'], expected: 'urgent' },

  // Ectopic / torsion / overdose-as-dose
  { id: 'SP06', group: 'special', chiefComplaint: 'Pregnant, one-sided pain', answers: ['Positive pregnancy test last week, sharp pain on my right side and pain in my shoulder tip, feel faint'], expected: 'emergency', note: 'ectopic' },
  { id: 'SP07', group: 'special', chiefComplaint: 'Pelvic pain', answers: ['Sudden severe pain in my lower left belly with vomiting, came on an hour ago, not pregnant'], expected: 'urgent', note: 'ovarian torsion' },
  { id: 'SP08', group: 'special', chiefComplaint: 'Took too much', answers: ['I took 30 of my 500 mg Tylenol about an hour ago'], expected: 'emergency', note: 'overdose stated as a count, not the word' },
  { id: 'SP09', group: 'special', chiefComplaint: 'Medication', answers: ['I take 2 of my 500 mg Tylenol twice a day for my knee'], expected: 'routine', mustNotExceed: 'routine', note: 'normal dosing must not trip the overdose pattern' },
  { id: 'SP10', group: 'special', chiefComplaint: 'Insulin', answers: ['I accidentally took my long acting insulin twice tonight and now I feel shaky and sweaty'], expected: 'emergency', note: 'insulin double dose with hypoglycemia symptoms' },

  // Round 4 — plain-English dyspnea / chest phrasings the review found slipping the floor
  { id: 'R4-01', group: 'review4', chiefComplaint: 'breathing', answers: ["I'm not able to breathe properly since this morning"], expected: 'emergency', note: '"not able to" — negation stripper used to eat it' },
  { id: 'R4-02', group: 'review4', chiefComplaint: 'breathing', answers: ['I cannot catch my breath walking to the bathroom'], expected: 'emergency' },
  { id: 'R4-03', group: 'review4', chiefComplaint: 'breathing', answers: ['I am unable to breathe right'], expected: 'emergency' },
  { id: 'R4-04', group: 'review4', chiefComplaint: 'breathing', answers: ["I'm having a hard time breathing"], expected: 'emergency', note: 'at rest unqualified → emergency' },
  { id: 'R4-05', group: 'review4', chiefComplaint: 'chest', answers: ['my chest has been hurting for an hour'], expected: 'emergency' },
  { id: 'R4-06', group: 'review4', chiefComplaint: 'chest', answers: ['my chest is aching and it goes into my jaw'], expected: 'emergency' },
  { id: 'R4-07', group: 'review4', chiefComplaint: 'breathing', answers: ['having trouble breathing since last night, worse lying down'], expected: 'emergency' },
  { id: 'R4-08', group: 'review4', chiefComplaint: 'breathing', answers: ['I get a little winded going up two flights of stairs, fine at rest, no chest pain'], expected: 'routine', mustNotExceed: 'urgent', note: 'exertional only — must not over-fire' },
  { id: 'R4-09', group: 'review4', chiefComplaint: 'cold', answers: ['stuffy nose, I can breathe fine, no chest pain, no fever'], expected: 'routine', mustNotExceed: 'routine', note: '"can breathe fine" must not trip' },
  { id: 'R4-10', group: 'review4', chiefComplaint: 'anxiety', answers: ['when I get anxious I feel like I am not able to breathe for a minute, it passes, happened last month'], expected: 'urgent', mustNotExceed: 'emergency', note: 'historical/episodic — fallback may over-triage; urgent or emergency both accepted' },
  // ── Round 5: long rambling transcripts — one red-flag clause buried in hundreds of words ──
  { id: 'L01', group: 'longform', chiefComplaint: 'Not feeling right', answers: ['Well doctor it has been quite a week, we had the grandkids over the weekend and I was out in the yard most of Saturday getting the beds ready before the frost, the mower has been acting up again so I pushed the old reel one around which at my age is a chore, and Sunday we drove over to Camden for the fish fry at the church which was lovely although the drive back took forever with the detour on 641, anyway Monday I felt a little off, kind of tired, my wife said I looked pale, I figured it was just the weekend catching up with me, I had my coffee as usual and the usual oatmeal, and then yesterday evening while I was carrying the trash cans up the driveway a heavy pressure settled in the middle of my chest and went up into my jaw, it eased after I sat on the porch a while, and then this morning I just feel worn out, my appetite is fine, bowels fine, sleeping okay apart from getting up to use the bathroom which is nothing new at my age, and I promised my wife I would at least ask somebody about it before the weekend'], expected: 'emergency', note: 'chest pressure + jaw, one clause in ~250 words' },
  { id: 'L02', group: 'longform', chiefComplaint: 'Trouble sleeping', answers: ['I guess it started after my husband passed in the spring, we were married forty one years and the house is very quiet now, my daughter calls most days and the neighbors have been kind, bringing casseroles and checking the mail when I was at my sister her place, and I keep busy with the quilting circle on Tuesdays and church on Sunday, but the nights are long, I will be honest, I lie there and my mind just goes, some nights I think everyone would be better off without me, and then morning comes and I get up and feed the cat and it passes, my appetite is not what it was, I have lost maybe eight pounds since April, no fevers, no pain anywhere really, just tired, and my daughter thought I should talk to somebody about the sleeping'], expected: 'emergency', note: 'passive SI buried mid-ramble — never suppressed' },
  { id: 'L03', group: 'longform', chiefComplaint: 'Checkup after a strange spell', answers: ['So I want to say up front that I feel completely fine right now which is why I almost did not fill this out, but my son insisted, basically what happened is we were at the lake house closing it up for the season, lot of lifting and carrying coolers and the dock sections which we do every year, and I slept fine, ate a big breakfast, eggs and toast, and we were loading the truck around ten when my left arm went numb all of a sudden and I could not hold the coffee cup, it slipped right out, and my son says my mouth looked a little funny for a few minutes though I did not notice, it all passed inside of maybe twenty minutes and we finished loading and drove home and I mowed the yard yesterday with no trouble at all, no headache, no chest pain, blood pressure pills I take every morning, and like I said I feel fine, but he made me promise'], expected: 'emergency', note: 'TIA story buried; "feel fine now" must not stand it down' },
  { id: 'L04', group: 'longform', chiefComplaint: 'Knee bothering me', answers: ['A bit of background first, heart trouble runs in my family, my father had a heart attack at sixty and his brother had one even younger, so I have always tried to stay active, I walk the dogs two miles most mornings and I watch what I eat more or less, and all of that is really just to say I take this stuff seriously, anyway the actual reason I am writing is my right knee, it has been aching after the morning walks for about six weeks now, worse going down the porch steps, no swelling that I can see, it does not lock up or give way, ibuprofen helps, I had no injury that I remember, no fever, I have no chest pain and no trouble breathing, I just want to know if I should rest it or keep walking'], expected: 'routine', mustNotExceed: 'urgent', note: 'family MI history early in a long ramble must not fire 911' },
  { id: 'L05', group: 'longform', chiefComplaint: 'Worried about my heart', answers: ['I will be honest, I think about my heart a lot because of my dad, he had his first heart attack at fifty five and a second one at sixty, and my uncle had bypass surgery, so every little twinge sends my mind racing, I bought a blood pressure cuff last year and my readings run around one twenty eight over eighty, I quit smoking nine years ago, I walk on the treadmill four days a week thirty minutes and I do fine with it, no problems during exercise at all, my cholesterol was borderline at my last physical two years ago, and what I actually want is just a checkup and maybe the calcium score test my brother in law had, to be clear I do not have chest pain and I have not had any trouble breathing, no dizziness, nothing like that, I just have not had a physical in two years and the family history worries me'], expected: 'routine', mustNotExceed: 'urgent', note: 'anxious family-history ramble; explicit negations must hold' },
  { id: 'L06', group: 'longform', chiefComplaint: 'Daughter has a cold', answers: ['She is three and she picked something up at daycare like they all do, it started Tuesday with a runny nose and she has been cranky and off her food, mostly wanting juice and her shows, we have done the humidifier at night and the saline spray which she hates, her fever was 100.4 last night with Tylenol bringing it down fine, her two cousins had the same thing last week and they are over it, the thing that worried my husband last night though is her cough got that barking sound and when she breathes in there is a high pitched noise and you can see her pulling in at her ribs a little, she settled some in the steamy bathroom, this morning she is playing but the cough is still there and I just want to know if this is one of those ride it out colds'], expected: 'emergency', note: 'stridor + retractions buried in a daycare-cold story' },

  // ── Round 5: minimisation — "it's probably nothing but…" must not soften a red flag ──
  { id: 'N01', group: 'minimize', chiefComplaint: 'Probably nothing', answers: ['It is probably nothing and I feel a little silly writing in, but I have had a tightness in my chest when I climb the stairs the last few days, it goes away when I rest a minute, I am sure it is just being out of shape'], expected: 'emergency', note: 'minimised exertional chest tightness — policy call 1' },
  { id: 'N02', group: 'minimize', chiefComplaint: 'Quick question', answers: ['I do not want to waste anyone\'s time, it is just some pressure in my chest since lunch, I probably just ate too fast, my wife made me write this'], expected: 'emergency', note: '"just some pressure" is still chest pressure' },
  { id: 'N03', group: 'minimize', chiefComplaint: 'Trouble sleeping', answers: ['Sorry to bother you so late, I could not sleep again so I took a few extra of my sleeping pills tonight, maybe 12 or so, and now I feel strange and heavy, I am sure I will be fine, I just wanted to check'], expected: 'emergency', note: '"a few extra, maybe 12" is an overdose stated softly' },
  { id: 'N04', group: 'minimize', chiefComplaint: 'Feel silly asking', answers: ['I feel silly even asking about this, but this morning my words came out all garbled for a minute or two, my husband could not understand me, it passed and I have been fine since, probably just tired, no headache, no weakness'], expected: 'emergency', note: 'transient garbled speech = TIA until proven otherwise' },
  { id: 'N05', group: 'minimize', chiefComplaint: 'Probably nothing', answers: ['Probably nothing, just a scratchy throat for two days, no fever, swallowing is fine, no trouble breathing, I feel okay otherwise, did not want it to turn into something before the weekend'], expected: 'routine', mustNotExceed: 'routine', note: 'minimisation words alone must not raise acuity' },

  // ── Round 5: Arabic — emergencies must fire; negation must not over-fire; flag + Arabic 911 line ──
  { id: 'AR01', group: 'arabic', chiefComplaint: 'ألم', answers: ['عندي ألم قوي في الصدر منذ ساعة ويمتد إلى ذراعي الأيسر'], expected: 'emergency', note: 'chest pain radiating to left arm, in Arabic' },
  { id: 'AR02', group: 'arabic', chiefComplaint: 'تنفس', answers: ['لا أستطيع التنفس جيداً وشفتاي تتحولان إلى اللون الأزرق'], expected: 'emergency', note: 'cannot breathe + blue lips' },
  { id: 'AR03', group: 'arabic', chiefComplaint: 'زوجي', answers: ['وجه زوجي مائل من جهة واحدة وكلامه غير واضح، بدأ قبل نصف ساعة'], expected: 'emergency', note: 'stroke signs reported by spouse, in Arabic' },
  { id: 'AR04', group: 'arabic', chiefComplaint: 'حزين', answers: ['أفكر في الانتحار ولا أريد أن أعيش بعد الآن'], expected: 'emergency', note: 'suicidal ideation in Arabic — never suppressed' },
  { id: 'AR05', group: 'arabic', chiefComplaint: 'حرقان', answers: ['عندي حرقان عند التبول منذ يومين، لا يوجد ألم في الصدر ولا توجد حمى'], expected: 'routine', mustNotExceed: 'urgent', note: 'Arabic negation ("لا يوجد ألم في الصدر") must not fire 911' },
  { id: 'AR06', group: 'arabic', chiefComplaint: 'ابني', answers: ['ابني أصيب بتشنجات قبل قليل ولا يستيقظ بشكل طبيعي'], expected: 'emergency', note: 'child seizure, not waking — in Arabic' },

  // ── Round 5: Vietnamese — emergencies must fire, with and without diacritics; negation must hold ──
  { id: 'VI01', group: 'vietnamese', chiefComplaint: 'đau ngực', answers: ['Tôi bị đau thắt ngực khoảng một giờ nay, lan lên hàm, kèm vã mồ hôi'], expected: 'emergency', note: 'chest pain radiating to jaw, Vietnamese' },
  { id: 'VI02', group: 'vietnamese', chiefComplaint: 'khó thở', answers: ['Tôi không thở được, môi tím tái, ngồi yên cũng mệt'], expected: 'emergency', note: 'cannot breathe + cyanosis' },
  { id: 'VI03', group: 'vietnamese', chiefComplaint: 'chồng tôi', answers: ['Miệng chồng tôi bị méo một bên và nói ngọng đột ngột, bắt đầu nửa tiếng trước'], expected: 'emergency', note: 'stroke signs reported by spouse, Vietnamese' },
  { id: 'VI04', group: 'vietnamese', chiefComplaint: 'buồn', answers: ['Tôi muốn chết, tôi không muốn sống nữa'], expected: 'emergency', note: 'suicidal ideation in Vietnamese — never suppressed' },
  { id: 'VI05', group: 'vietnamese', chiefComplaint: 'tiểu buốt', answers: ['Tôi bị tiểu buốt hai ngày nay, không đau ngực, không sốt, không khó thở'], expected: 'routine', mustNotExceed: 'urgent', note: 'Vietnamese negation ("không đau ngực", "không khó thở") must not over-fire' },
  { id: 'VI06', group: 'vietnamese', chiefComplaint: 'kho tho', answers: ['toi khong tho duoc nguc rat tuc kho chiu lam'], expected: 'emergency', note: 'no-diacritic typing ("khong tho duoc") — common on US keyboards' },
];
