import { useState } from 'react';
import { Link } from 'react-router';
import { Helmet } from '@dr.pogodin/react-helmet';
import type { Acuity, ClinicalBrief } from '@/lib/clinical-brief';
import { DispositionCard, ProviderNote } from '@/components/clinical-brief-view';

/* ────────────────────────────────────────────────────────────────────────────
   /demo — "See the visit before it starts."
   A clearly-labeled, illustrative walk-through of one sample visit, end to end:
   the patient's own words → a smart triage disposition (what the patient is
   guided to do) → the provider co-pilot: an inverted-SOAP draft note with a
   differential and suggested workup (what the clinician opens, to review and
   decide). Sample patients only — not real people, not medical advice.
   ──────────────────────────────────────────────────────────────────────────── */

interface Scenario {
  id: string;
  tab: string;
  patientLine: string;
  chat: { role: 'patient' | 'ace'; text: string }[];
  disposition: { level: Acuity; label: string; timeframe: string; rationale: string; safetyNet: string };
  flags: string[];
  note: { plan: string[]; assessment: string; objective: string[]; hpi: string };
  differential: { condition: string; likelihood: 'higher' | 'possible' | 'consider'; rationale: string }[];
  workup: { item: string; rationale: string }[];
}

const SCENARIOS: Scenario[] = [
  {
    id: 'throat',
    tab: 'Sore throat & fever',
    patientLine: '“Sore throat, fever, and it hurts to swallow — 3 days.”',
    chat: [
      { role: 'patient', text: "I've had a sore throat for 3 days and it really hurts to swallow. I feel feverish." },
      { role: 'ace', text: 'That sounds rough. Have you been able to check your temperature, and are you having any cough or runny nose?' },
      { role: 'patient', text: 'Temp was 101.4 this morning. No cough, no runny nose really.' },
      { role: 'ace', text: 'Thanks. Any swollen glands in your neck, white patches in the throat, or trouble breathing?' },
      { role: 'patient', text: 'My neck is tender and swollen, and I saw some white spots. Breathing is fine.' },
      { role: 'ace', text: 'Got it. Any drug allergies, and are you taking any medications?' },
      { role: 'patient', text: 'No allergies. Just a daily multivitamin.' },
    ],
    disposition: {
      level: 'urgent',
      label: 'Same-day visit — telehealth or urgent care',
      timeframe: 'today',
      rationale: 'Your symptoms line up with a throat infection that often needs a quick strep test and may need antibiotics — worth being seen today.',
      safetyNet: 'Go to the ER now if you have trouble breathing, can’t swallow your own saliva, start drooling, or your voice becomes muffled.',
    },
    flags: ['Centor-high: fever + exudate + tender anterior nodes, no cough', 'Rule out Group A strep'],
    note: {
      plan: [
        'Rapid strep antigen (RADT) ± throat culture to confirm GAS',
        'If strep-positive / Centor ≥ 3: first-line antibiotics per local guidance (PCN or amoxicillin; cephalexin or azithromycin if PCN-allergic)',
        'Symptomatic care: analgesics/antipyretics, fluids, salt-water gargles',
        'Airway return precautions reviewed',
      ],
      assessment: 'Acute pharyngitis, likely bacterial (Centor-high) — rule out GAS; consider mononucleosis if course persists.',
      objective: ['Vitals incl. temperature', 'Oropharynx — tonsillar exudate', 'Anterior cervical lymphadenopathy', 'Confirm no stridor / drooling / trismus'],
      hpi: '3 days of sore throat with odynophagia and subjective fever to 101.4°F. Tender, swollen anterior neck with tonsillar exudate noted by patient. No cough, rhinorrhea, or dyspnea. NKDA. Meds: multivitamin.',
    },
    differential: [
      { condition: 'Group A strep pharyngitis', likelihood: 'higher', rationale: 'Fever, exudate, tender anterior nodes, no cough (Centor-high)' },
      { condition: 'Viral pharyngitis', likelihood: 'possible', rationale: 'Common; exudate less typical' },
      { condition: 'Infectious mononucleosis', likelihood: 'consider', rationale: 'Exudate + adenopathy — check age, fatigue, posterior nodes' },
      { condition: 'Peritonsillar abscess', likelihood: 'consider', rationale: 'Escalate if trismus, muffled voice, uvular deviation' },
    ],
    workup: [
      { item: 'Rapid strep antigen ± culture', rationale: 'Confirm GAS before antibiotics' },
      { item: 'Monospot / CBC if mono suspected', rationale: 'Exudate + marked adenopathy or fatigue' },
    ],
  },
  {
    id: 'chest',
    tab: 'Exertional chest tightness',
    patientLine: '“Chest tightness on the stairs, eases with rest — this week.”',
    chat: [
      { role: 'patient', text: 'The last few days I get a tight feeling in my chest when I walk up stairs. It goes away when I stop.' },
      { role: 'ace', text: 'Thank you for telling me — that’s important. Does it spread anywhere, like your arm, neck, or jaw, and do you get short of breath or sweaty with it?' },
      { role: 'patient', text: 'Sometimes it goes into my left arm. I get a little short of breath. No sweating.' },
      { role: 'ace', text: 'Understood. Right now, sitting here at rest, are you having any chest tightness or pain?' },
      { role: 'patient', text: 'No, I feel okay at rest.' },
      { role: 'ace', text: 'Okay. Do you have high blood pressure, diabetes, or high cholesterol, any family history of heart disease — and have you ever smoked?' },
      { role: 'patient', text: 'High blood pressure and cholesterol. My dad had a heart attack at 55. I used to smoke.' },
    ],
    disposition: {
      level: 'urgent',
      label: 'In-person evaluation today — don’t wait',
      timeframe: 'today',
      rationale: 'Chest tightness that comes on with exertion and eases with rest, with your history, can be a warning sign from the heart and should be checked today.',
      safetyNet: 'Call 911 right away if chest pain comes on at rest, lasts more than a few minutes, or comes with sweating, nausea, or spreading to your arm or jaw.',
    },
    flags: ['Exertional chest tightness with radiation + dyspnea', 'ASCVD risk: HTN, HLD, former smoker, FHx MI < 55', 'Suspected angina — urgent rule-out of ACS'],
    note: {
      plan: [
        'Same-day in-person evaluation; do not defer',
        'ECG now; serial troponin if any rest pain or ongoing symptoms',
        'Screen for unstable features — if present, activate ED pathway',
        'Aspirin if no contraindication (clinician decision)',
        'Risk-factor optimization: BP, lipids, smoking cessation',
      ],
      assessment: 'Exertional chest tightness with radiation and dyspnea on a background of multiple ASCVD risk factors — suspected angina; rule out ACS.',
      objective: ['Vitals incl. BP both arms, SpO₂', 'Cardiopulmonary exam', '12-lead ECG', 'Signs of heart failure / murmurs'],
      hpi: 'Several days of substernal chest tightness provoked by stair-climbing, relieved by rest, intermittently radiating to the left arm with mild exertional dyspnea; asymptomatic at rest. PMH: HTN, hyperlipidemia. Former smoker. FHx: father MI at 55.',
    },
    differential: [
      { condition: 'Stable angina / CAD', likelihood: 'higher', rationale: 'Exertional, reproducible, relieved by rest; strong risk profile' },
      { condition: 'Unstable angina / ACS', likelihood: 'possible', rationale: 'New and progressive — needs same-day rule-out' },
      { condition: 'GERD / musculoskeletal', likelihood: 'consider', rationale: 'Common mimics; a diagnosis of exclusion here' },
    ],
    workup: [
      { item: '12-lead ECG', rationale: 'Ischemia / arrhythmia' },
      { item: 'Troponin (serial if symptomatic)', rationale: 'Rule out infarction' },
      { item: 'Lipid panel, A1c, BMP', rationale: 'Risk stratification' },
      { item: 'Stress test / cardiology referral if ACS excluded', rationale: 'Evaluate for CAD' },
    ],
  },
  {
    id: 'refill',
    tab: 'BP refill & review',
    patientLine: '“Refill my blood-pressure med and go over my numbers.”',
    chat: [
      { role: 'patient', text: 'I need a refill on my lisinopril and wanted to go over my blood pressure readings.' },
      { role: 'ace', text: 'Happy to get that ready for your provider. Do you know your dose, and how your home readings have been running?' },
      { role: 'patient', text: 'Lisinopril 10 mg once a day. My home readings are around 118 over 76 most mornings.' },
      { role: 'ace', text: 'That’s excellent control. Any side effects like a dry cough, dizziness, or swelling — and are you taking it regularly?' },
      { role: 'patient', text: 'No side effects, I take it every day. No cough.' },
      { role: 'ace', text: 'Perfect. Any other medications, allergies, or concerns to pass along?' },
      { role: 'patient', text: 'No allergies. Just the lisinopril and a baby aspirin.' },
    ],
    disposition: {
      level: 'routine',
      label: 'Routine scheduled visit',
      timeframe: 'at your convenience',
      rationale: 'Your blood pressure is well controlled and you’re tolerating your medication — a routine visit to refill and review is all that’s needed.',
      safetyNet: 'Seek urgent care if a reading is over 180/120 with symptoms like a severe headache, chest pain, vision changes, or trouble speaking.',
    },
    flags: [],
    note: {
      plan: [
        'Refill lisinopril 10 mg daily — routine renewal',
        'Continue home BP monitoring; goal per guideline / clinician',
        'Reinforce adherence; no new side effects reported',
        'Routine labs if due (BMP for ACE-inhibitor monitoring)',
      ],
      assessment: 'Hypertension, well controlled on lisinopril 10 mg daily; no medication intolerance.',
      objective: ['Office BP (confirm home avg ≈ 118/76)', 'Review home BP log', 'Assess ACE-inhibitor side effects (cough, edema)', 'Renal/volume status if labs due'],
      hpi: 'Established HTN on lisinopril 10 mg daily, adherent and tolerating well, with home readings averaging ≈ 118/76. Requests routine refill and review. Also takes low-dose aspirin. NKDA. Denies cough, dizziness, edema.',
    },
    differential: [],
    workup: [
      { item: 'BMP if due', rationale: 'ACE-inhibitor monitoring — renal function / K⁺' },
      { item: 'Lipids / A1c if overdue', rationale: 'ASCVD risk review' },
    ],
  },
  {
    id: 'uti',
    tab: 'Burning with urination',
    patientLine: '“Burning when I pee and going constantly — 2 days.”',
    chat: [
      { role: 'patient', text: 'It burns when I pee and I keep feeling like I have to go, for about two days now.' },
      { role: 'ace', text: 'That’s uncomfortable. Any fever or chills, or pain in your back or side?' },
      { role: 'patient', text: 'No fever, and no back pain. It’s mostly just the burning and going a lot.' },
      { role: 'ace', text: 'Got it. Any blood in your urine or new discharge, and have you had urinary tract infections before?' },
      { role: 'patient', text: 'No blood, no discharge. I’ve had a couple of UTIs in the past.' },
      { role: 'ace', text: 'Thanks. Any allergies to medications?' },
      { role: 'patient', text: 'No allergies.' },
    ],
    disposition: {
      level: 'telehealth',
      label: 'Telehealth visit — today or tomorrow',
      timeframe: 'within 24 hours',
      rationale: 'Your symptoms sound like a urinary tract infection, which can usually be sorted out with a quick virtual visit and a urine test or prescription.',
      safetyNet: 'Go to urgent care or the ER if you develop a fever over 101°F, back or side pain, nausea or vomiting, or blood in your urine — that can signal a kidney infection.',
    },
    flags: ['Lower-UTI features; no red flags for pyelonephritis'],
    note: {
      plan: [
        'Urinalysis ± culture to confirm',
        'If uncomplicated cystitis: short-course first-line antibiotics per local resistance (e.g., nitrofurantoin or TMP-SMX)',
        'Hydration; short-course phenazopyridine for symptom relief if appropriate',
        'Return precautions for pyelonephritis',
      ],
      assessment: 'Acute uncomplicated cystitis (lower UTI) — no features of pyelonephritis.',
      objective: ['Vitals incl. temperature', 'CVA (flank) tenderness', 'Suprapubic tenderness', 'Urinalysis / dipstick'],
      hpi: '2 days of dysuria with urinary frequency and urgency. Denies fever, flank/back pain, hematuria, or vaginal discharge. Hx of prior UTIs. NKDA.',
    },
    differential: [
      { condition: 'Uncomplicated cystitis', likelihood: 'higher', rationale: 'Dysuria + frequency without systemic or flank features' },
      { condition: 'Pyelonephritis', likelihood: 'consider', rationale: 'Escalate if fever, flank pain, or vomiting develop' },
      { condition: 'Vaginitis / STI', likelihood: 'consider', rationale: 'If discharge or risk factors present' },
    ],
    workup: [{ item: 'Urinalysis + culture', rationale: 'Confirm infection; guide therapy' }],
  },
  {
    id: 'cold',
    tab: 'Cold, run down',
    patientLine: '“Runny nose, cough, and feeling run down — 3 days.”',
    chat: [
      { role: 'patient', text: 'I’ve had a runny nose and a cough for about three days and I just feel run down.' },
      { role: 'ace', text: 'Sorry you’re feeling lousy. Any fever, and are you having any trouble breathing or chest pain?' },
      { role: 'patient', text: 'Maybe a low fever the first day. No trouble breathing, no chest pain.' },
      { role: 'ace', text: 'Good. Are you able to eat and drink okay, and is it getting better, worse, or about the same?' },
      { role: 'patient', text: 'Eating and drinking fine. About the same, maybe a little better.' },
      { role: 'ace', text: 'Thanks. Any ongoing health conditions or medications to note?' },
      { role: 'patient', text: 'No, I’m generally healthy. No regular medications.' },
    ],
    disposition: {
      level: 'selfcare',
      label: 'Self-care — follow up if it lingers',
      timeframe: 'now, with follow-up if needed',
      rationale: 'This sounds like a common cold, which usually clears on its own within a week or so with rest and fluids.',
      safetyNet: 'See a provider if you get a fever over 101.5°F for more than a couple of days, trouble breathing, chest pain, or symptoms that last beyond 10 days or get worse.',
    },
    flags: [],
    note: {
      plan: [
        'Supportive care: rest, fluids, OTC symptom relief as appropriate',
        'No antibiotics indicated for viral URI',
        'Return precautions reviewed (dyspnea, high/persistent fever, worsening after improvement)',
      ],
      assessment: 'Viral upper respiratory infection (common cold) — self-limited, no red flags.',
      objective: ['Vitals incl. temp, SpO₂', 'Lungs clear to auscultation?', 'Hydration status'],
      hpi: '3 days of rhinorrhea, cough, and malaise; brief low-grade fever on day 1. Denies dyspnea, chest pain, or high fever. Tolerating oral intake. Generally healthy, no regular meds. NKDA.',
    },
    differential: [
      { condition: 'Viral URI', likelihood: 'higher', rationale: 'Typical self-limited cold symptoms' },
      { condition: 'Influenza', likelihood: 'consider', rationale: 'If high fever / myalgias and in season' },
      { condition: 'Bacterial sinusitis', likelihood: 'consider', rationale: 'If >10 days or worsening after improvement' },
    ],
    workup: [],
  },
  {
    id: 'stroke',
    tab: 'Face drooping, arm weak',
    patientLine: '“My face is drooping and my left arm feels weak — 30 minutes.”',
    chat: [
      { role: 'patient', text: 'My face looks droopy on one side and my left arm feels weak. It started about 30 minutes ago.' },
      { role: 'ace', text: 'This could be a stroke, and every minute matters. Please call 911 right now — don’t drive yourself. Try to note the exact time your symptoms started.' },
    ],
    disposition: {
      level: 'emergency',
      label: 'Call 911 now — possible stroke',
      timeframe: 'now',
      rationale: 'Sudden face drooping and arm weakness can be signs of a stroke. Call 911 immediately — treatment works best in the first hours.',
      safetyNet: 'Do not drive yourself. Note the exact time symptoms started and tell the 911 dispatcher. Do not take aspirin unless a professional tells you to.',
    },
    flags: ['FAST positive: facial droop + unilateral arm weakness', 'Last known well ~30 min ago — time-critical', 'Activate stroke pathway'],
    note: {
      plan: [
        '911 / EMS activation — do NOT delay or route to a virtual visit',
        'Stroke pathway; document last-known-well time (~30 min ago)',
        'NPO; do not give aspirin until hemorrhage excluded on imaging',
        'On arrival: emergent non-contrast head CT; fingerstick glucose',
      ],
      assessment: 'Acute focal neuro deficit (left facial droop + left arm weakness), onset ~30 min — suspected acute stroke until proven otherwise.',
      objective: ['Time last known well', 'FAST / NIHSS', 'Fingerstick glucose', 'BP both arms'],
      hpi: 'Sudden onset (~30 min ago) left-sided facial droop and left arm weakness. Time-critical presentation.',
    },
    differential: [
      { condition: 'Acute ischemic stroke', likelihood: 'higher', rationale: 'Sudden focal deficit, FAST positive' },
      { condition: 'Hemorrhagic stroke', likelihood: 'possible', rationale: 'Cannot be excluded without imaging' },
      { condition: 'Stroke mimic (hypoglycemia, seizure, migraine)', likelihood: 'consider', rationale: 'Check glucose; reassess' },
    ],
    workup: [
      { item: 'Emergent non-contrast head CT', rationale: 'Ischemic vs. hemorrhagic' },
      { item: 'Fingerstick glucose', rationale: 'Rule out hypoglycemia mimic' },
      { item: 'Stroke labs (CBC, coags, type & screen)', rationale: 'Pre-treatment workup' },
    ],
  },
];

// Build a ClinicalBrief from a demo scenario so the showcase renders through the
// exact same components as the real patient/provider views.
function scenarioBrief(s: Scenario): ClinicalBrief {
  return { summary: '', flags: s.flags, disposition: s.disposition, note: s.note, differential: s.differential, workup: s.workup };
}

const DEMO_CSS = `
.demo-reveal{animation:demoUp .5s cubic-bezier(.2,.7,.3,1) both}
.demo-reveal-2{animation:demoUp .5s .08s cubic-bezier(.2,.7,.3,1) both}
.demo-reveal-3{animation:demoUp .5s .16s cubic-bezier(.2,.7,.3,1) both}
@keyframes demoUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion: reduce){.demo-reveal,.demo-reveal-2,.demo-reveal-3{animation:none}}
`;

function ActLabel({ n, title, sub }: { n: string; title: string; sub: string }) {
  return (
    <div className="flex items-baseline gap-3 mb-5">
      <span className="font-mono text-xs tracking-widest" style={{ color: 'hsl(var(--primary))' }}>{n}</span>
      <div>
        <h3 className="text-foreground font-semibold" style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem' }}>{title}</h3>
        <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-dimmer))' }}>{sub}</p>
      </div>
    </div>
  );
}

function ChatReplay({ s }: { s: Scenario }) {
  return (
    <div className="flex flex-col gap-3">
      {s.chat.map((m, i) => (
        <div
          key={i}
          className="max-w-[86%] px-4 py-2.5 text-[15px] leading-relaxed"
          style={{
            alignSelf: m.role === 'patient' ? 'flex-end' : 'flex-start',
            borderRadius: 18,
            borderBottomRightRadius: m.role === 'patient' ? 6 : 18,
            borderBottomLeftRadius: m.role === 'ace' ? 6 : 18,
            background: m.role === 'patient' ? 'hsl(var(--primary))' : 'hsl(var(--surface-deeper))',
            color: m.role === 'patient' ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
            border: m.role === 'ace' ? '1px solid hsl(var(--border-subtle))' : 'none',
          }}
        >
          {m.role === 'ace' && <span className="block font-mono text-[10px] mb-1 tracking-wide" style={{ color: 'hsl(var(--primary))' }}>ACE</span>}
          {m.text}
        </div>
      ))}
    </div>
  );
}

export default function DemoPage() {
  const [idx, setIdx] = useState(0);
  const s = SCENARIOS[idx];

  return (
    <>
      <Helmet>
        <title>See a sample visit — Acute Insight AI</title>
        <meta name="description" content="Watch one illustrative visit, end to end: a patient's words become a smart triage recommendation and a provider-ready note with a differential and suggested workup." />
      </Helmet>
      <style>{DEMO_CSS}</style>

      <main style={{ background: 'hsl(var(--background))' }}>
        {/* Hero */}
        <section className="relative px-6 pt-32 md:pt-40 pb-10 overflow-hidden">
          <div className="bg-telemetry absolute inset-0 pointer-events-none" style={{ opacity: 0.3 }} aria-hidden="true" />
          <div className="relative max-w-3xl mx-auto text-center">
            <p className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium mb-6 font-mono" style={{ color: 'hsl(var(--text-dim))', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border-subtle))' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'hsl(var(--primary))' }} />
              Illustrative demo · sample patients · not medical advice
            </p>
            <h1 className="display text-foreground mb-5" style={{ fontSize: 'clamp(2.4rem, 5.2vw, 4rem)' }}>See the visit before it starts.</h1>
            <p className="text-lg leading-relaxed mx-auto max-w-2xl" style={{ color: 'hsl(var(--text-dim))' }}>
              One sample visit, end to end. Watch a patient’s own words become the right next step for them — and a ready-to-review note for the clinician, in a physician’s format.
            </p>
          </div>
        </section>

        {/* Scenario picker */}
        <section className="px-6 pb-4">
          <div className="max-w-3xl mx-auto">
            <p className="font-mono text-xs uppercase tracking-widest text-center mb-4" style={{ color: 'hsl(var(--primary))' }}>Pick a sample patient</p>
            <div className="flex flex-wrap justify-center gap-2.5">
              {SCENARIOS.map((sc, i) => (
                <button
                  key={sc.id}
                  onClick={() => setIdx(i)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                  style={{
                    fontFamily: 'var(--font-sans)',
                    color: i === idx ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
                    background: i === idx ? 'hsl(var(--primary))' : 'hsl(var(--card))',
                    border: `1px solid ${i === idx ? 'hsl(var(--primary))' : 'hsl(var(--border-subtle))'}`,
                    boxShadow: i === idx ? '0 0 20px hsl(var(--primary) / 0.3)' : 'none',
                  }}
                >
                  {sc.tab}
                </button>
              ))}
            </div>
            <p className="text-center mt-5 text-xl md:text-2xl" style={{ color: 'hsl(var(--foreground))', fontFamily: 'var(--font-heading)' }}>{s.patientLine}</p>
          </div>
        </section>

        {/* The three acts — re-keyed per scenario so they animate in together */}
        <section className="px-6 py-10" key={s.id}>
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-6 lg:gap-8 items-start">
            {/* Left column: conversation + disposition */}
            <div className="flex flex-col gap-6">
              <div className="demo-reveal rounded-2xl p-6" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border-subtle))' }}>
                <ActLabel n="01" title="The conversation" sub="Ace adapts to each answer — talk or type" />
                <ChatReplay s={s} />
              </div>
              <div className="demo-reveal-2">
                <ActLabel n="02" title="Smart triage" sub="What the patient is guided to do next" />
                <DispositionCard disposition={s.disposition} />
              </div>
            </div>

            {/* Right column: provider co-pilot */}
            <div className="demo-reveal-3 lg:sticky lg:top-24">
              <ActLabel n="03" title="The provider co-pilot" sub="What your clinician opens — to review and decide" />
              <ProviderNote brief={scenarioBrief(s)} />
            </div>
          </div>

          {/* Emergency note */}
          <div className="max-w-6xl mx-auto mt-8">
            <div className="rounded-xl px-5 py-4 flex items-center gap-3" style={{ background: 'hsl(var(--destructive) / 0.06)', border: '1px solid hsl(var(--destructive) / 0.25)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--destructive))" strokeWidth="2" className="shrink-0"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></svg>
              <p className="text-sm" style={{ color: 'hsl(var(--text-dim))' }}>
                <span className="font-semibold" style={{ color: 'hsl(var(--destructive))' }}>And when it’s an emergency:</span> if anything the patient describes looks dangerous — chest pain at rest, trouble breathing, stroke signs, thoughts of self-harm — Ace stops the intake immediately and directs them to 911 or 988. It never waits for an online visit.
              </p>
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="px-6 py-20">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="display text-foreground mb-4" style={{ fontSize: 'clamp(1.9rem, 3.6vw, 2.8rem)' }}>This is how every visit could start.</h2>
            <p className="text-lg mb-9" style={{ color: 'hsl(var(--text-dim))' }}>Patients arrive understood. Clinicians walk in already prepared.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/intake" className="inline-flex items-center justify-center px-7 py-3.5 rounded-xl text-base font-semibold bg-primary hover:brightness-110 transition" style={{ color: 'hsl(var(--primary-foreground))', fontFamily: 'var(--font-heading)', boxShadow: '0 0 28px hsl(var(--primary) / 0.4)' }}>
                Try it yourself
              </Link>
              <Link to="/providers" className="inline-flex items-center justify-center px-7 py-3.5 rounded-xl text-base font-semibold transition hover:border-foreground/40" style={{ color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border-subtle))', fontFamily: 'var(--font-heading)' }}>
                For providers
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
