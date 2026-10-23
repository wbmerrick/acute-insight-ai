import { useState, useCallback, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Helmet } from '@dr.pogodin/react-helmet';
import { motion, AnimatePresence } from 'motion/react';
import { ProtectedRoute } from '@/lib/auth/auth-client';
import { intake } from 'virtual:content';

// ─── Question title/subtitle resolver ────────────────────────────────────────

function resolveQuestionText(id: string): { title: string; subtitle: string } {
  switch (id) {
    case 'chief_complaint': return { title: intake.stepChiefComplaintTitle, subtitle: intake.stepChiefComplaintSubtitle };
    case 'severity':        return { title: intake.stepSeverityTitle,        subtitle: intake.stepSeveritySubtitle };
    case 'duration':        return { title: intake.stepDurationTitle,        subtitle: intake.stepDurationSubtitle };
    case 'associated':      return { title: intake.stepAssociatedTitle,      subtitle: intake.stepAssociatedSubtitle };
    case 'medications':     return { title: intake.stepMedicationsTitle,     subtitle: intake.stepMedicationsSubtitle };
    case 'allergies':       return { title: intake.stepAllergiesTitle,       subtitle: intake.stepAllergiesSubtitle };
    case 'history':         return { title: intake.stepHistoryTitle,         subtitle: intake.stepHistorySubtitle };
    case 'notes':           return { title: intake.stepNotesTitle,           subtitle: intake.stepNotesSubtitle };
    default:                return { title: id, subtitle: '' };
  }
}



interface Option {
  value: string;
  label: string;
  subtitle?: string;
  icon?: string;
  flagTrigger?: boolean;
  emergencyTrigger?: boolean;
}

interface EmergencyCategory {
  category: string;
  headline: string;
  warningSymptoms: string[];
}

const EMERGENCY_CATEGORIES: EmergencyCategory[] = [
  {
    category: 'Chest pain',
    headline: 'Possible cardiac emergency',
    warningSymptoms: [
      'New or persistent pressure or tightness in the chest',
      'Pain with exertion, shortness of breath, sweating, or nausea',
      'Pain radiating to the arm, jaw, or back',
      'Fainting or near-fainting with chest discomfort',
    ],
  },
  {
    category: 'Breathing difficulty',
    headline: 'Severe respiratory distress',
    warningSymptoms: [
      'Unable to speak in full sentences',
      'Blue or gray lips or fingertips',
      'Stridor (high-pitched sound when breathing in)',
      'Rapidly worsening shortness of breath',
    ],
  },
  {
    category: 'Stroke symptoms',
    headline: 'Possible stroke — time is critical',
    warningSymptoms: [
      'Sudden facial droop or one-sided weakness',
      'Sudden numbness on one side of the body',
      'Difficulty speaking or understanding speech',
      'Sudden vision loss or double vision',
      'Inability to walk or sudden severe dizziness',
    ],
  },
  {
    category: 'Severe headache',
    headline: 'Possible serious neurological event',
    warningSymptoms: [
      'Sudden "thunderclap" onset — worst headache of your life',
      'Headache with weakness, confusion, or seizure',
      'Headache with fever and neck stiffness',
      'Headache following significant head trauma',
    ],
  },
  {
    category: 'Altered consciousness',
    headline: 'Altered mental status — call 911',
    warningSymptoms: [
      'New confusion or disorientation',
      'Difficulty awakening or unresponsiveness',
      'Loss of consciousness',
      'Markedly abnormal or dangerous behavior',
    ],
  },
  {
    category: 'Seizure',
    headline: 'Seizure requiring emergency care',
    warningSymptoms: [
      'First-ever seizure',
      'Seizure lasting 5 minutes or longer',
      'Repeated seizures without recovery between them',
      'Persistent difficulty breathing after a seizure',
    ],
  },
  {
    category: 'Allergic reaction',
    headline: 'Possible anaphylaxis',
    warningSymptoms: [
      'Tongue or throat swelling',
      'Hoarseness or trouble breathing',
      'Hives with faintness or vomiting',
      'Rapid worsening after exposure to an allergen',
    ],
  },
  {
    category: 'Abdominal or pelvic pain',
    headline: 'Possible surgical or obstetric emergency',
    warningSymptoms: [
      'Sudden or severe abdominal pain',
      'Rigid or board-like abdomen',
      'Pain with fainting or near-fainting',
      'Possible pregnancy with pain or bleeding',
    ],
  },
  {
    category: 'Bleeding',
    headline: 'Serious or uncontrolled bleeding',
    warningSymptoms: [
      'Bleeding that will not stop with pressure',
      'Vomiting blood',
      'Black, tarry, or heavily bloody stools',
      'Heavy vaginal bleeding with weakness or fainting',
    ],
  },
  {
    category: 'Severe infection',
    headline: 'Possible sepsis',
    warningSymptoms: [
      'Suspected infection with confusion or disorientation',
      'Respiratory distress or very rapid breathing',
      'Fainting or very low blood pressure',
      'Mottled or discolored skin',
      'Markedly reduced urine output',
    ],
  },
  {
    category: 'Vomiting or diarrhea',
    headline: 'Severe dehydration or GI emergency',
    warningSymptoms: [
      'Unable to keep any fluids down',
      'Fainting or confusion with vomiting or diarrhea',
      'Minimal or no urine output',
      'Severe abdominal pain or blood in stool or vomit',
    ],
  },
  {
    category: 'Back or neck pain',
    headline: 'Possible spinal emergency',
    warningSymptoms: [
      'New weakness or paralysis in the arms or legs',
      'Saddle numbness (inner thighs, groin, or buttocks)',
      'Loss of bladder or bowel control',
      'Urinary retention',
      'Pain following major trauma',
    ],
  },
  {
    category: 'Eye symptoms',
    headline: 'Possible vision-threatening emergency',
    warningSymptoms: [
      'Sudden loss of vision in one or both eyes',
      'Severe eye pain with decreased vision',
      'Penetrating eye injury',
      'Chemical exposure to the eye',
    ],
  },
  {
    category: 'Limb or testicular pain',
    headline: 'Possible vascular or urological emergency',
    warningSymptoms: [
      'Suddenly cold, pale, or painful limb',
      'Sudden severe testicular pain',
      'Leg swelling with chest pain or breathlessness',
    ],
  },
  {
    category: 'Poisoning or overdose',
    headline: 'Suspected overdose or dangerous ingestion',
    warningSymptoms: [
      'Slowed or stopped breathing',
      'Extreme sleepiness or unresponsiveness',
      'Seizure following ingestion',
      'Confusion after suspected overdose',
    ],
  },
  {
    category: 'Psychiatric safety',
    headline: 'Immediate psychiatric emergency',
    warningSymptoms: [
      'Suicidal intent or a specific plan',
      'Homicidal intent',
      'Recent suicide attempt',
      'Severe agitation or psychosis creating immediate danger to self or others',
    ],
  },
  {
    category: 'Major injury',
    headline: 'Serious traumatic injury',
    warningSymptoms: [
      'Significant head or spine injury',
      'Uncontrolled bleeding from trauma',
      'Major burns or smoke inhalation',
      'Near drowning',
    ],
  },
];

interface Question {
  id: string;
  type: 'single' | 'multi' | 'scale' | 'text';
  options?: Option[];
  required?: boolean;
  /** If set, this question only shows when the answer to `dependsOn.id` includes `dependsOn.value` */
  dependsOn?: { id: string; value: string };
}

interface SymptomCategory {
  category: string;
  symptoms: Option[];
}

const SYMPTOM_CATEGORIES: SymptomCategory[] = [
  {
    category: 'Respiratory & ENT',
    symptoms: [
      { value: 'Cough, congestion, sore throat', label: 'Cough, congestion, sore throat', subtitle: 'Viral URI, allergic rhinitis, sinusitis' },
      { value: 'Sneezing, itchy eyes, runny nose', label: 'Sneezing, itchy eyes, runny nose', subtitle: 'Seasonal allergies' },
    ],
  },
  {
    category: 'Skin',
    symptoms: [
      { value: 'Localized rash or itching', label: 'Localized rash or itching', subtitle: 'Contact dermatitis, eczema, fungal infection' },
      { value: 'Acne, hair thinning', label: 'Acne, hair thinning', subtitle: 'Acne vulgaris, androgenetic alopecia' },
    ],
  },
  {
    category: 'Urinary',
    symptoms: [
      { value: 'Burning or frequent urination', label: 'Burning or frequent urination', subtitle: 'Uncomplicated cystitis' },
    ],
  },
  {
    category: 'Digestive',
    symptoms: [
      { value: 'Heartburn, sour taste, belching', label: 'Heartburn, sour taste, belching', subtitle: 'GERD' },
      { value: 'Mild diarrhea, nausea, constipation', label: 'Mild diarrhea, nausea, constipation', subtitle: 'GI illness, medication effects, functional constipation' },
    ],
  },
  {
    category: 'Musculoskeletal',
    symptoms: [
      { value: 'Back or neck soreness', label: 'Back or neck soreness', subtitle: 'Muscle strain or spasm' },
    ],
  },
  {
    category: 'Neurological',
    symptoms: [
      { value: 'Familiar, recurrent headache', label: 'Familiar, recurrent headache', subtitle: 'Established migraine or tension headache' },
    ],
  },
  {
    category: 'Mental Health',
    symptoms: [
      { value: 'Difficulty sleeping, anxiety, low mood', label: 'Difficulty sleeping, anxiety, low mood', subtitle: 'Insomnia, anxiety, depression' },
    ],
  },
  {
    category: "Men's Health",
    symptoms: [
      { value: 'Erectile difficulty, premature ejaculation', label: 'Erectile difficulty, premature ejaculation', subtitle: 'Routine sexual-health evaluation' },
    ],
  },
  {
    category: 'General',
    symptoms: [
      { value: 'Weight concerns, medication refills', label: 'Weight concerns, medication refills', subtitle: 'Weight management, stable chronic-condition follow-up' },
      { value: 'Routine check-up', label: 'Routine check-up', subtitle: 'Preventive care, annual wellness visit' },
    ],
  },
  {
    category: '🚨 Emergency — Call 911',
    symptoms: [
      { value: 'Chest pain', label: 'Chest pain', subtitle: 'Pressure, tightness, or pain with exertion', flagTrigger: true, emergencyTrigger: true },
      { value: 'Breathing difficulty', label: 'Breathing difficulty', subtitle: 'Severe shortness of breath, unable to speak', flagTrigger: true, emergencyTrigger: true },
      { value: 'Stroke symptoms', label: 'Stroke symptoms', subtitle: 'Facial droop, one-sided weakness, speech loss', flagTrigger: true, emergencyTrigger: true },
      { value: 'Severe headache', label: 'Severe headache', subtitle: 'Sudden thunderclap or worst headache of life', flagTrigger: true, emergencyTrigger: true },
      { value: 'Altered consciousness', label: 'Altered consciousness', subtitle: 'Confusion, unresponsiveness, loss of consciousness', flagTrigger: true, emergencyTrigger: true },
      { value: 'Seizure', label: 'Seizure', subtitle: 'First seizure, lasting ≥5 min, or repeated', flagTrigger: true, emergencyTrigger: true },
      { value: 'Allergic reaction', label: 'Severe allergic reaction', subtitle: 'Throat swelling, hives with faintness', flagTrigger: true, emergencyTrigger: true },
      { value: 'Abdominal or pelvic pain', label: 'Severe abdominal or pelvic pain', subtitle: 'Sudden, rigid abdomen, or pain with fainting', flagTrigger: true, emergencyTrigger: true },
      { value: 'Bleeding', label: 'Uncontrolled bleeding', subtitle: 'Won\'t stop, vomiting blood, or tarry stools', flagTrigger: true, emergencyTrigger: true },
      { value: 'Severe infection', label: 'Severe infection or sepsis', subtitle: 'Infection with confusion, low BP, or mottled skin', flagTrigger: true, emergencyTrigger: true },
      { value: 'Vomiting or diarrhea', label: 'Severe vomiting or diarrhea', subtitle: 'Can\'t keep fluids down, fainting, or blood', flagTrigger: true, emergencyTrigger: true },
      { value: 'Back or neck pain', label: 'Back or neck pain with neurologic signs', subtitle: 'New weakness, numbness, or loss of bladder control', flagTrigger: true, emergencyTrigger: true },
      { value: 'Eye symptoms', label: 'Eye emergency', subtitle: 'Sudden vision loss, severe pain, or chemical exposure', flagTrigger: true, emergencyTrigger: true },
      { value: 'Limb or testicular pain', label: 'Limb or testicular emergency', subtitle: 'Cold/pale limb, sudden testicular pain', flagTrigger: true, emergencyTrigger: true },
      { value: 'Poisoning or overdose', label: 'Poisoning or overdose', subtitle: 'Slowed breathing, seizure, or extreme sleepiness', flagTrigger: true, emergencyTrigger: true },
      { value: 'Psychiatric safety', label: 'Psychiatric safety concern', subtitle: 'Suicidal or homicidal intent, recent attempt', flagTrigger: true, emergencyTrigger: true },
      { value: 'Major injury', label: 'Major injury', subtitle: 'Head/spine trauma, major burns, uncontrolled bleeding', flagTrigger: true, emergencyTrigger: true },
    ],
  },
];

// Flat list used for flag detection and QA submission
const CHIEF_COMPLAINT_OPTIONS: Option[] = [
  ...SYMPTOM_CATEGORIES.flatMap((c) => c.symptoms),
  { value: '__other__', label: 'Other (describe below)' },
];

const DURATION_OPTIONS: Option[] = [
  { value: 'Less than 24 hours', label: 'Less than 24 hours' },
  { value: '1–3 days', label: '1–3 days' },
  { value: '4–7 days', label: '4–7 days' },
  { value: '1–4 weeks', label: '1–4 weeks' },
  { value: '1–3 months', label: '1–3 months' },
  { value: 'More than 3 months', label: 'More than 3 months' },
];

const ASSOCIATED_OPTIONS: Option[] = [
  { value: 'Nausea or vomiting', label: 'Nausea or vomiting' },
  { value: 'Dizziness or lightheadedness', label: 'Dizziness or lightheadedness' },
  { value: 'Chest pain', label: 'Chest pain', flagTrigger: true },
  { value: 'Shortness of breath', label: 'Shortness of breath', flagTrigger: true },
  { value: 'Fainting', label: 'Fainting', flagTrigger: true },
  { value: 'Severe headache', label: 'Severe headache', flagTrigger: true },
  { value: 'Swelling', label: 'Swelling' },
  { value: 'Numbness or tingling', label: 'Numbness or tingling' },
  { value: 'None of the above', label: 'None of the above' },
];

const MEDICATIONS_OPTIONS: Option[] = [
  { value: 'No medications', label: 'No medications' },
  { value: 'Blood pressure medication', label: 'Blood pressure medication' },
  { value: 'Cholesterol medication', label: 'Cholesterol medication' },
  { value: 'Diabetes medication or insulin', label: 'Diabetes medication or insulin' },
  { value: 'Antidepressants or anxiety medication', label: 'Antidepressants or anxiety medication' },
  { value: 'Pain relievers (OTC)', label: 'Pain relievers (OTC)' },
  { value: 'Vitamins or supplements', label: 'Vitamins or supplements' },
  { value: '__other__', label: 'Other (describe below)' },
];

const ALLERGIES_OPTIONS: Option[] = [
  { value: 'No known allergies', label: 'No known allergies' },
  { value: 'Penicillin or antibiotics', label: 'Penicillin or antibiotics' },
  { value: 'Aspirin or NSAIDs', label: 'Aspirin or NSAIDs' },
  { value: 'Sulfa drugs', label: 'Sulfa drugs' },
  { value: 'Latex', label: 'Latex' },
  { value: 'Food allergies', label: 'Food allergies' },
  { value: 'Environmental allergies', label: 'Environmental allergies' },
  { value: '__other__', label: 'Other (describe below)' },
];

const HISTORY_OPTIONS: Option[] = [
  { value: 'None', label: 'None' },
  { value: 'Hypertension', label: 'Hypertension' },
  { value: 'Diabetes (Type 1 or 2)', label: 'Diabetes (Type 1 or 2)' },
  { value: 'Heart disease', label: 'Heart disease' },
  { value: 'Asthma or COPD', label: 'Asthma or COPD' },
  { value: 'Thyroid disorder', label: 'Thyroid disorder' },
  { value: 'Depression or anxiety', label: 'Depression or anxiety' },
  { value: 'Arthritis', label: 'Arthritis' },
  { value: '__other__', label: 'Other (describe below)' },
];

const QUESTIONS: Question[] = [
  {
    id: 'chief_complaint',
    type: 'single',
    options: CHIEF_COMPLAINT_OPTIONS,
    required: true,
  },
  {
    id: 'severity',
    type: 'scale',
    required: true,
    dependsOn: undefined,
  },
  {
    id: 'duration',
    type: 'single',
    options: DURATION_OPTIONS,
    required: true,
  },
  {
    id: 'associated',
    type: 'multi',
    options: ASSOCIATED_OPTIONS,
    required: false,
  },
  {
    id: 'medications',
    type: 'multi',
    options: MEDICATIONS_OPTIONS,
    required: false,
  },
  {
    id: 'allergies',
    type: 'multi',
    options: ALLERGIES_OPTIONS,
    required: false,
  },
  {
    id: 'history',
    type: 'multi',
    options: HISTORY_OPTIONS,
    required: false,
  },
  {
    id: 'notes',
    type: 'text',
    required: false,
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type Answers = Record<string, string | string[]>;

// ─── Scale input ──────────────────────────────────────────────────────────────

function ScaleInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const selected = value ? parseInt(value, 10) : null;
  const labels = ['Minimal', '', '', 'Moderate', '', '', '', 'Severe', '', 'Worst possible'];

  return (
    <div className="w-full">
      <div className="flex gap-2 mb-3">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const isSelected = selected === n;
          const color =
            n <= 3
              ? 'var(--primary)'
              : n <= 6
              ? 'var(--secondary)'
              : 'var(--destructive)';
          return (
            <button
              key={n}
              onClick={() => onChange(String(n))}
              className="flex-1 aspect-square rounded-xl text-sm font-bold transition-all duration-150"
              style={{
                fontFamily: 'var(--font-heading)',
                background: isSelected ? `hsl(${color})` : `hsl(var(--card))`,
                color: isSelected ? `hsl(var(--background))` : `hsl(var(--foreground))`,
                border: `1px solid ${isSelected ? `hsl(${color})` : `hsl(var(--border-subtle) / 0.4)`}`,
                transform: isSelected ? 'scale(1.08)' : 'scale(1)',
              }}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between">
        <span className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
          {labels[0]}
        </span>
        <span className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
          {labels[9]}
        </span>
      </div>
    </div>
  );
}

// ─── Emergency screen ─────────────────────────────────────────────────────────

function EmergencyScreen({
  symptomValue,
  onContinue,
}: {
  symptomValue: string;
  onContinue: () => void;
}) {
  const emergencyInfo = EMERGENCY_CATEGORIES.find((e) => e.category === symptomValue);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex flex-col items-center text-center px-2 py-4"
    >
      {/* Pulsing siren icon */}
      <motion.div
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{ background: `hsl(var(--destructive) / 0.15)`, border: `2px solid hsl(var(--destructive) / 0.5)` }}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--destructive))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </motion.div>

      <h2
        className="text-2xl font-bold mb-2"
        style={{ color: `hsl(var(--destructive))`, fontFamily: 'var(--font-heading)' }}
      >
        Call 911 Now
      </h2>
      <p
        className="text-base mb-1 font-semibold"
        style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-sans)' }}
      >
        {emergencyInfo?.headline ?? 'This may be a life-threatening emergency'}
      </p>
      <p
        className="text-sm mb-6 max-w-sm"
        style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}
      >
        Online care cannot safely treat this. Please call 911 or go to your nearest emergency department immediately.
      </p>

      {/* 911 call button */}
      <a
        href="tel:911"
        className="flex items-center gap-3 rounded-2xl px-8 py-4 text-lg font-bold mb-6 transition-all duration-150 hover:opacity-90 active:scale-95"
        style={{
          background: `hsl(var(--destructive))`,
          color: `hsl(var(--background))`,
          fontFamily: 'var(--font-heading)',
          textDecoration: 'none',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l1.97-1.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
        Call 911
      </a>

      {/* Warning symptoms list */}
      {emergencyInfo && (
        <div
          className="w-full max-w-sm rounded-2xl p-4 mb-6 text-left"
          style={{ background: `hsl(var(--destructive) / 0.07)`, border: `1px solid hsl(var(--destructive) / 0.25)` }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: `hsl(var(--destructive))`, fontFamily: 'var(--font-sans)' }}
          >
            Warning signs for this category
          </p>
          <ul className="flex flex-col gap-2">
            {emergencyInfo.warningSymptoms.map((sym) => (
              <li key={sym} className="flex items-start gap-2">
                <span
                  className="mt-1 w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: `hsl(var(--destructive))` }}
                />
                <span
                  className="text-sm leading-snug"
                  style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-sans)' }}
                >
                  {sym}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Continue anyway */}
      <div className="flex flex-col items-center gap-2">
        <p
          className="text-xs"
          style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}
        >
          Completing your intake can help speed up your ER visit.
        </p>
        <button
          onClick={onContinue}
          className="text-sm underline underline-offset-2 transition-opacity hover:opacity-70"
          style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Continue intake anyway →
        </button>
      </div>
    </motion.div>
  );
}

// ─── Symptom chip (chief complaint grid) ─────────────────────────────────────

function SymptomChip({
  label,
  subtitle,
  selected,
  flagTrigger,
  emergencyTrigger,
  onClick,
}: {
  label: string;
  subtitle?: string;
  selected: boolean;
  flagTrigger?: boolean;
  emergencyTrigger?: boolean;
  onClick: () => void;
}) {
  const isEmergency = emergencyTrigger;
  const isFlag = flagTrigger && !emergencyTrigger;

  return (
    <motion.button
      onClick={onClick}
      className="text-left rounded-xl px-4 py-3 transition-all duration-150 w-full"
      style={{
        fontFamily: 'var(--font-sans)',
        background: selected
          ? isEmergency
            ? `hsl(var(--destructive) / 0.15)`
            : isFlag
            ? `hsl(var(--destructive) / 0.08)`
            : `hsl(var(--primary) / 0.1)`
          : isEmergency
          ? `hsl(var(--destructive) / 0.05)`
          : `hsl(var(--card))`,
        border: `1.5px solid ${
          selected
            ? isEmergency
              ? `hsl(var(--destructive) / 0.8)`
              : isFlag
              ? `hsl(var(--destructive) / 0.5)`
              : `hsl(var(--primary) / 0.6)`
            : isEmergency
            ? `hsl(var(--destructive) / 0.3)`
            : `hsl(var(--border-subtle) / 0.35)`
        }`,
      }}
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.1 }}
    >
      <span className="flex items-start gap-2.5">
        {/* Radio dot or warning icon */}
        {isEmergency ? (
          <span className="mt-0.5 shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke={selected ? 'hsl(var(--destructive))' : 'hsl(var(--destructive) / 0.6)'}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </span>
        ) : (
          <span
            className="mt-0.5 w-4 h-4 rounded-full shrink-0 flex items-center justify-center"
            style={{
              background: selected
                ? isFlag
                  ? `hsl(var(--destructive))`
                  : `hsl(var(--primary))`
                : 'transparent',
              border: `2px solid ${
                selected
                  ? isFlag
                    ? `hsl(var(--destructive))`
                    : `hsl(var(--primary))`
                  : `hsl(var(--border-subtle))`
              }`,
            }}
          >
            {selected && (
              <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                <circle cx="5" cy="5" r="2.5" fill="hsl(var(--background))" />
              </svg>
            )}
          </span>
        )}
        <span className="flex flex-col gap-0.5 min-w-0">
          <span
            className="text-sm leading-snug"
            style={{
              color: selected
                ? isEmergency || isFlag
                  ? `hsl(var(--destructive))`
                  : `hsl(var(--primary))`
                : isEmergency
                ? `hsl(var(--destructive))`
                : `hsl(var(--foreground))`,
              fontWeight: selected || isEmergency ? 600 : 400,
            }}
          >
            {label}
          </span>
          {subtitle && (
            <span
              className="text-xs leading-snug"
              style={{ color: isEmergency ? `hsl(var(--destructive) / 0.7)` : `hsl(var(--muted-foreground))` }}
            >
              {subtitle}
            </span>
          )}
        </span>
      </span>
    </motion.button>
  );
}

function SymptomGrid({
  answer,
  onAnswer,
}: {
  answer: string;
  onAnswer: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {SYMPTOM_CATEGORIES.map((cat) => (
        <div key={cat.category}>
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}
          >
            {cat.category}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {cat.symptoms.map((sym) => (
              <SymptomChip
                key={sym.value}
                label={sym.label}
                subtitle={sym.subtitle}
                selected={answer === sym.value}
                flagTrigger={sym.flagTrigger}
                emergencyTrigger={sym.emergencyTrigger}
                onClick={() => onAnswer(sym.value)}
              />
            ))}
          </div>
        </div>
      ))}
      <div>
        <p
          className="text-xs font-semibold uppercase tracking-wider mb-2"
          style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}
        >
          Other
        </p>
        <motion.button
          onClick={() => onAnswer('__other__')}
          className="text-left rounded-xl px-4 py-3 transition-all duration-150 w-full"
          style={{
            fontFamily: 'var(--font-sans)',
            background: answer === '__other__' ? `hsl(var(--primary) / 0.1)` : `hsl(var(--card))`,
            border: `1.5px solid ${answer === '__other__' ? `hsl(var(--primary) / 0.6)` : `hsl(var(--border-subtle) / 0.35)`}`,
          }}
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.985 }}
          transition={{ duration: 0.1 }}
        >
          <span className="flex items-center gap-2.5">
            <span
              className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center"
              style={{
                background: answer === '__other__' ? `hsl(var(--primary))` : 'transparent',
                border: `2px solid ${answer === '__other__' ? `hsl(var(--primary))` : `hsl(var(--border-subtle))`}`,
              }}
            >
              {answer === '__other__' && (
                <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                  <circle cx="5" cy="5" r="2.5" fill="hsl(var(--background))" />
                </svg>
              )}
            </span>
            <span
              className="text-sm"
              style={{
                color: answer === '__other__' ? `hsl(var(--primary))` : `hsl(var(--foreground))`,
                fontWeight: answer === '__other__' ? 600 : 400,
              }}
            >
              {intake.otherOption}
            </span>
          </span>
        </motion.button>
      </div>
    </div>
  );
}

// ─── Option button ────────────────────────────────────────────────────────────

function OptionButton({
  label,
  selected,
  onClick,
  multi,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  multi: boolean;
}) {
  return (
    <motion.button
      onClick={onClick}
      className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all duration-150"
      style={{
        fontFamily: 'var(--font-sans)',
        background: selected ? `hsl(var(--primary) / 0.1)` : `hsl(var(--card))`,
        border: `1px solid ${selected ? `hsl(var(--primary) / 0.5)` : `hsl(var(--border-subtle) / 0.4)`}`,
        color: selected ? `hsl(var(--primary))` : `hsl(var(--foreground))`,
        fontWeight: selected ? 600 : 400,
      }}
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.995 }}
      transition={{ duration: 0.1 }}
    >
      <span className="flex items-center gap-3">
        <span
          className="w-4 h-4 rounded shrink-0 flex items-center justify-center"
          style={{
            background: selected ? `hsl(var(--primary))` : 'transparent',
            border: `2px solid ${selected ? `hsl(var(--primary))` : `hsl(var(--border-subtle))`}`,
            borderRadius: multi ? '4px' : '50%',
          }}
        >
          {selected && (
            <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
              {multi ? (
                <path d="M2 5l2.5 2.5L8 3" stroke="hsl(var(--background))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              ) : (
                <circle cx="5" cy="5" r="2.5" fill="hsl(var(--background))"/>
              )}
            </svg>
          )}
        </span>
        {label}
      </span>
    </motion.button>
  );
}

// ─── Step view ────────────────────────────────────────────────────────────────

function StepView({
  question,
  answer,
  otherText,
  descriptionText,
  onAnswer,
  onOtherText,
  onDescriptionText,
}: {
  question: Question;
  answer: string | string[];
  otherText: string;
  descriptionText: string;
  onAnswer: (v: string | string[]) => void;
  onOtherText: (v: string) => void;
  onDescriptionText: (v: string) => void;
}) {
  const hasOther =
    (question.type === 'single' && answer === '__other__') ||
    (question.type === 'multi' && Array.isArray(answer) && answer.includes('__other__'));

  if (question.type === 'scale') {
    return <ScaleInput value={answer as string} onChange={onAnswer} />;
  }

  if (question.type === 'text') {
    return (
      <textarea
        value={answer as string}
        onChange={(e) => onAnswer(e.target.value)}
        placeholder={intake.stepNotesPlaceholder}
        rows={5}
        className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none transition-all duration-200"
        style={{
          background: `hsl(var(--card))`,
          border: `1px solid hsl(var(--border-subtle) / 0.5)`,
          color: `hsl(var(--foreground))`,
          fontFamily: 'var(--font-sans)',
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = `hsl(var(--primary) / 0.5)`)}
        onBlur={(e) => (e.currentTarget.style.borderColor = `hsl(var(--border-subtle) / 0.5)`)}
      />
    );
  }

  const multi = question.type === 'multi';

  // Chief complaint uses the categorized symptom grid
  if (question.id === 'chief_complaint') {
    return (
      <div className="flex flex-col gap-3">
        <SymptomGrid answer={answer as string} onAnswer={onAnswer} />
        {/* "Other" free-text reveal */}
        {answer === '__other__' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.2 }}
          >
            <textarea
              value={otherText}
              onChange={(e) => onOtherText(e.target.value)}
              placeholder={intake.otherPlaceholder}
              rows={3}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none mt-1 transition-all duration-200"
              style={{
                background: `hsl(var(--card))`,
                border: `1px solid hsl(var(--primary) / 0.3)`,
                color: `hsl(var(--foreground))`,
                fontFamily: 'var(--font-sans)',
              }}
            />
          </motion.div>
        )}
        {/* Always-visible description field */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
          className="mt-1"
        >
          <label
            className="block text-xs font-medium mb-1.5"
            style={{ color: `hsl(var(--foreground) / 0.6)`, fontFamily: 'var(--font-sans)' }}
          >
            {intake.stepChiefComplaintDescriptionLabel}
          </label>
          <textarea
            value={descriptionText}
            onChange={(e) => onDescriptionText(e.target.value)}
            placeholder={intake.stepChiefComplaintDescriptionPlaceholder}
            rows={3}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none transition-all duration-200"
            style={{
              background: `hsl(var(--card))`,
              border: `1px solid hsl(var(--border-subtle) / 0.5)`,
              color: `hsl(var(--foreground))`,
              fontFamily: 'var(--font-sans)',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = `hsl(var(--primary) / 0.5)`)}
            onBlur={(e) => (e.currentTarget.style.borderColor = `hsl(var(--border-subtle) / 0.5)`)}
          />
        </motion.div>
      </div>
    );
  }

  function toggle(val: string) {
    if (!multi) {
      onAnswer(val);
      return;
    }
    const arr = Array.isArray(answer) ? [...answer] : [];
    // "None of the above" / "No medications" / "No known allergies" / "None" clears others
    const exclusiveValues = ['None of the above', 'No medications', 'No known allergies', 'None'];
    if (exclusiveValues.includes(val)) {
      onAnswer(arr.includes(val) ? [] : [val]);
      return;
    }
    // Selecting a real option clears exclusive
    const withoutExclusive = arr.filter((v) => !exclusiveValues.includes(v));
    if (withoutExclusive.includes(val)) {
      onAnswer(withoutExclusive.filter((v) => v !== val));
    } else {
      onAnswer([...withoutExclusive, val]);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {question.options!.map((opt) => {
        const isSelected = multi
          ? Array.isArray(answer) && answer.includes(opt.value)
          : answer === opt.value;
        return (
          <OptionButton
            key={opt.value}
            label={opt.label}
            selected={isSelected}
            onClick={() => toggle(opt.value)}
            multi={multi}
          />
        );
      })}
      {hasOther && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.2 }}
        >
          <textarea
            value={otherText}
            onChange={(e) => onOtherText(e.target.value)}
            placeholder={intake.otherPlaceholder}
            rows={3}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none mt-1 transition-all duration-200"
            style={{
              background: `hsl(var(--card))`,
              border: `1px solid hsl(var(--primary) / 0.3)`,
              color: `hsl(var(--foreground))`,
              fontFamily: 'var(--font-sans)',
            }}
          />
        </motion.div>
      )}
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
          {intake.progressLabel} {current} {intake.progressOf} {total}
        </span>
        <span className="text-xs font-semibold" style={{ color: `hsl(var(--primary))`, fontFamily: 'var(--font-sans)' }}>
          {pct}%
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: `hsl(var(--border-subtle) / 0.3)` }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: `hsl(var(--primary))` }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// ─── Start screen ─────────────────────────────────────────────────────────────

function StartScreen({ onStart, onStartChat, loading }: { onStart: () => void; onStartChat: () => void; loading: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="flex flex-col items-center text-center max-w-md mx-auto"
    >
      {/* Icon */}
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-8"
        style={{
          background: `hsl(var(--primary) / 0.1)`,
          border: `1px solid hsl(var(--primary) / 0.25)`,
          boxShadow: `0 0 40px hsl(var(--primary) / 0.12)`,
        }}
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
      </div>

      <h1 className="text-3xl font-bold text-foreground mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
        {intake.startHeading}
      </h1>
      <p className="text-muted-foreground mb-8 leading-relaxed" style={{ fontFamily: 'var(--font-sans)' }}>
        {intake.startSubheading}
      </p>

      {/* Stats row */}
      <div className="flex gap-6 mb-10">
        <div className="text-center">
          <div className="text-xl font-bold text-foreground mb-0.5" style={{ fontFamily: 'var(--font-heading)' }}>
            {intake.statQuestionsValue}
          </div>
          <div className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
            {intake.statQuestionsLabel}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-foreground mb-0.5" style={{ fontFamily: 'var(--font-heading)' }}>
            {intake.statMinutesValue}
          </div>
          <div className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
            {intake.statMinutesLabel}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-foreground mb-0.5" style={{ fontFamily: 'var(--font-heading)' }}>
            {intake.statHipaaValue}
          </div>
          <div className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
            {intake.statHipaaLabel}
          </div>
        </div>
      </div>

      {/* Mode buttons */}
      <div className="w-full flex flex-col gap-3 mb-4">
        <button
          onClick={onStart}
          disabled={loading}
          className="w-full py-4 rounded-2xl text-base font-semibold transition-all duration-200 disabled:opacity-60"
          style={{
            background: `hsl(var(--primary))`,
            color: `hsl(var(--background))`,
            fontFamily: 'var(--font-heading)',
            boxShadow: `0 0 24px hsl(var(--primary) / 0.3)`,
          }}
        >
          {loading ? intake.savingLabel : intake.startButton}
        </button>

        <button
          onClick={onStartChat}
          disabled={loading}
          className="w-full py-4 rounded-2xl text-base font-semibold transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2"
          style={{
            background: `hsl(var(--card))`,
            color: `hsl(var(--foreground))`,
            border: `1px solid hsl(var(--border-subtle) / 0.5)`,
            fontFamily: 'var(--font-heading)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Chat with AI instead
        </button>
      </div>

      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5" style={{ fontFamily: 'var(--font-sans)' }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0110 0v4"/>
        </svg>
        {intake.hipaaNote}
      </p>
    </motion.div>
  );
}

// ─── Complete screen ──────────────────────────────────────────────────────────

function CompleteScreen({ onReset }: { onReset: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex flex-col items-center text-center max-w-md mx-auto"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 15 }}
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-8"
        style={{
          background: `hsl(var(--primary) / 0.1)`,
          border: `1px solid hsl(var(--primary) / 0.3)`,
          boxShadow: `0 0 40px hsl(var(--primary) / 0.15)`,
        }}
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      </motion.div>

      <h2 className="text-3xl font-bold text-foreground mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
        {intake.completeHeading}
      </h2>
      <p className="text-muted-foreground mb-10 leading-relaxed" style={{ fontFamily: 'var(--font-sans)' }}>
        {intake.completeSubheading}
      </p>

      <div className="flex flex-col gap-3 w-full">
        <Link
          to="/portal"
          className="w-full py-4 rounded-2xl text-base font-semibold text-center transition-all duration-200"
          style={{
            background: `hsl(var(--primary))`,
            color: `hsl(var(--background))`,
            fontFamily: 'var(--font-heading)',
            boxShadow: `0 0 24px hsl(var(--primary) / 0.25)`,
          }}
        >
          {intake.completePortalButton}
        </Link>
        <button
          onClick={onReset}
          className="w-full py-3 rounded-2xl text-sm font-medium transition-all duration-200"
          style={{
            background: `hsl(var(--card))`,
            color: `hsl(var(--foreground))`,
            border: `1px solid hsl(var(--border-subtle) / 0.5)`,
            fontFamily: 'var(--font-sans)',
          }}
        >
          {intake.completeNewButton}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Chat message types ───────────────────────────────────────────────────────

interface ChatMessage {
  role: 'ai' | 'patient';
  content: string;
}

// ─── Chat flow ────────────────────────────────────────────────────────────────

function ChatFlow({
  intakeId,
  onComplete,
  onBack,
}: {
  intakeId: number;
  onComplete: () => void;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [emergency, setEmergency] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch the opening AI message on mount
  useEffect(() => {
    async function fetchWelcome() {
      setAiTyping(true);
      try {
        const res = await fetch('/api/intake/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [], intakeId }),
        });
        const data = await res.json() as { reply: string; done: boolean };
        setMessages([{ role: 'ai', content: data.reply }]);
      } catch {
        setMessages([{ role: 'ai', content: 'Hello! What brings you in today? Please describe your main concern.' }]);
      } finally {
        setAiTyping(false);
      }
    }
    fetchWelcome();
  }, [intakeId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, aiTyping]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading || aiTyping) return;

    const newMessages: ChatMessage[] = [...messages, { role: 'patient', content: text }];
    setMessages(newMessages);
    setInput('');
    setAiTyping(true);
    setError('');

    try {
      const res = await fetch('/api/intake/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, intakeId }),
      });
      const data = await res.json() as { reply: string; done: boolean; emergency?: boolean };

      // Simulate a brief typing delay for realism
      await new Promise((r) => setTimeout(r, 600));

      setMessages((prev) => [...prev, { role: 'ai', content: data.reply }]);
      if (data.done) setDone(true);
      if (data.emergency) setEmergency(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setAiTyping(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      // Convert chat transcript to Q&A pairs for the complete endpoint
      const qaPairs = messages
        .filter((m) => m.role === 'patient')
        .map((m, i) => ({
          questionId: `chat_turn_${i + 1}`,
          question: messages.filter((msg) => msg.role === 'ai')[i]?.content ?? 'Follow-up',
          answer: m.content,
        }));

      // Extract chief complaint from first patient message
      const firstPatient = messages.find((m) => m.role === 'patient');
      const chiefComplaint = firstPatient?.content ?? 'General concern (chat intake)';

      const res = await fetch(`/api/intake/${intakeId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses: qaPairs, chiefComplaint }),
      });
      if (!res.ok) throw new Error('Submit failed');
      onComplete();
    } catch {
      setError('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col h-full"
      style={{ minHeight: 'calc(100vh - 80px)' }}
    >
      {/* Chat header */}
      <div className="flex items-center gap-3 mb-4 pb-4" style={{ borderBottom: `1px solid hsl(var(--border-subtle) / 0.3)` }}>
        <button
          onClick={onBack}
          className="p-2 rounded-xl transition-colors duration-150 hover:opacity-70"
          style={{ background: `hsl(var(--card))`, border: `1px solid hsl(var(--border-subtle) / 0.4)`, color: `hsl(var(--foreground))` }}
          aria-label="Back to start"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `hsl(var(--primary) / 0.12)`, border: `1px solid hsl(var(--primary) / 0.25)` }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-heading)' }}>
            AI Intake Assistant
          </p>
          <p className="text-xs" style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)' }}>
            Private to you and your care team
          </p>
        </div>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-4" style={{ maxHeight: 'calc(100vh - 320px)', minHeight: '300px' }}>
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${msg.role === 'patient' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'ai' && (
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mr-2 mt-0.5"
                  style={{ background: `hsl(var(--primary) / 0.12)`, border: `1px solid hsl(var(--primary) / 0.2)` }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                  </svg>
                </div>
              )}
              <div
                className="max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
                style={{
                  background: msg.role === 'patient'
                    ? `hsl(var(--primary))`
                    : `hsl(var(--card))`,
                  color: msg.role === 'patient'
                    ? `hsl(var(--background))`
                    : `hsl(var(--foreground))`,
                  border: msg.role === 'ai' ? `1px solid hsl(var(--border-subtle) / 0.3)` : 'none',
                  borderRadius: msg.role === 'patient' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {aiTyping && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start items-end gap-2"
          >
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `hsl(var(--primary) / 0.12)`, border: `1px solid hsl(var(--primary) / 0.2)` }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <div
              className="rounded-2xl px-4 py-3 flex items-center gap-1"
              style={{
                background: `hsl(var(--card))`,
                border: `1px solid hsl(var(--border-subtle) / 0.3)`,
                borderRadius: '18px 18px 18px 4px',
              }}
            >
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: `hsl(var(--muted-foreground))` }}
                  animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Emergency banner */}
      {emergency && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl px-4 py-3 mb-3 flex items-start gap-3"
          style={{ background: `hsl(var(--destructive) / 0.1)`, border: `1px solid hsl(var(--destructive) / 0.4)` }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--destructive))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <div>
            <p className="text-xs font-semibold mb-0.5" style={{ color: `hsl(var(--destructive))`, fontFamily: 'var(--font-heading)' }}>
              Possible emergency detected
            </p>
            <a href="tel:911" className="text-xs underline" style={{ color: `hsl(var(--destructive))`, fontFamily: 'var(--font-sans)' }}>
              Call 911 now
            </a>
          </div>
        </motion.div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs mb-2" style={{ color: `hsl(var(--destructive))`, fontFamily: 'var(--font-sans)' }}>
          {error}
        </p>
      )}

      {/* Input area */}
      {!done ? (
        <div
          className="flex items-end gap-2 rounded-2xl p-2"
          style={{ background: `hsl(var(--card))`, border: `1px solid hsl(var(--border-subtle) / 0.4)` }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message… (Enter to send, Shift+Enter for new line)"
            rows={2}
            disabled={loading || aiTyping}
            className="flex-1 bg-transparent text-sm outline-none resize-none px-2 py-1"
            style={{ color: `hsl(var(--foreground))`, fontFamily: 'var(--font-sans)' }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading || aiTyping}
            className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 disabled:opacity-40"
            style={{
              background: input.trim() ? `hsl(var(--primary))` : `hsl(var(--muted))`,
              color: input.trim() ? `hsl(var(--background))` : `hsl(var(--muted-foreground))`,
            }}
            aria-label="Send message"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3"
        >
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-4 rounded-2xl text-base font-semibold transition-all duration-200 disabled:opacity-60"
            style={{
              background: `hsl(var(--primary))`,
              color: `hsl(var(--background))`,
              fontFamily: 'var(--font-heading)',
              boxShadow: `0 0 24px hsl(var(--primary) / 0.3)`,
            }}
          >
            {submitting ? 'Submitting…' : 'Submit intake'}
          </button>
          <button
            onClick={sendMessage}
            disabled={!input.trim() || aiTyping}
            className="text-sm underline underline-offset-2 transition-opacity hover:opacity-70"
            style={{ color: `hsl(var(--muted-foreground))`, fontFamily: 'var(--font-sans)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Add something first
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Main flow ────────────────────────────────────────────────────────────────

function IntakeFlow() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'start' | 'questions' | 'chat' | 'emergency' | 'complete'>('start');
  const [emergencySymptom, setEmergencySymptom] = useState<string>('');
  const [intakeId, setIntakeId] = useState<number | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [otherTexts, setOtherTexts] = useState<Record<string, string>>({});
  const [descriptionTexts, setDescriptionTexts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [direction, setDirection] = useState(1);

  // Filter questions based on adaptive logic
  const activeQuestions = QUESTIONS.filter((q) => {
    if (!q.dependsOn) return true;
    const dep = answers[q.dependsOn.id];
    if (Array.isArray(dep)) return dep.includes(q.dependsOn.value);
    return dep === q.dependsOn.value;
  });

  // Skip severity for routine check-up
  const visibleQuestions = activeQuestions.filter((q) => {
    if (q.id === 'severity') {
      const cc = answers['chief_complaint'];
      if (cc === 'Routine check-up') return false;
    }
    return true;
  });

  const totalSteps = visibleQuestions.length;
  const currentQuestion = visibleQuestions[stepIndex];

  const currentAnswer = currentQuestion ? (answers[currentQuestion.id] ?? (currentQuestion.type === 'multi' ? [] : '')) : '';
  const currentOther = currentQuestion ? (otherTexts[currentQuestion.id] ?? '') : '';
  const currentDescription = currentQuestion ? (descriptionTexts[currentQuestion.id] ?? '') : '';

  const canAdvance = useCallback(() => {
    if (!currentQuestion) return false;
    if (!currentQuestion.required) return true;
    const ans = answers[currentQuestion.id];
    if (!ans) return false;
    if (Array.isArray(ans)) return ans.length > 0;
    return String(ans).trim().length > 0;
  }, [currentQuestion, answers]);

  async function handleStart() {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/intake/start', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to start');
      const data = await res.json() as { id: number };
      setIntakeId(data.id);
      setPhase('questions');
      setStepIndex(0);
    } catch {
      setError(intake.errorLabel);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStartChat() {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/intake/start', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to start');
      const data = await res.json() as { id: number };
      setIntakeId(data.id);
      setPhase('chat');
    } catch {
      setError(intake.errorLabel);
    } finally {
      setSubmitting(false);
    }
  }

  function handleAnswer(val: string | string[]) {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: val }));

    // Immediately show emergency screen if an emergency symptom is selected
    if (currentQuestion.id === 'chief_complaint' && typeof val === 'string') {
      const allSymptoms = SYMPTOM_CATEGORIES.flatMap((c) => c.symptoms);
      const selected = allSymptoms.find((s) => s.value === val);
      if (selected?.emergencyTrigger) {
        setEmergencySymptom(val);
        setPhase('emergency');
      }
    }
  }

  function handleOtherText(val: string) {
    if (!currentQuestion) return;
    setOtherTexts((prev) => ({ ...prev, [currentQuestion.id]: val }));
  }

  function handleDescriptionText(val: string) {
    if (!currentQuestion) return;
    setDescriptionTexts((prev) => ({ ...prev, [currentQuestion.id]: val }));
  }

  function handleContinueFromEmergency() {
    setPhase('questions');
  }

  function handleBack() {
    if (stepIndex === 0) {
      setPhase('start');
      return;
    }
    setDirection(-1);
    setStepIndex((i) => i - 1);
  }

  async function handleNext() {
    if (stepIndex < totalSteps - 1) {
      setDirection(1);
      setStepIndex((i) => i + 1);
      return;
    }
    // Last step — submit
    if (!intakeId) return;
    setSubmitting(true);
    setError('');
    try {
      // Build QA pairs, resolving __other__ values
      const qaPairs = visibleQuestions.map((q) => {
        let ans = answers[q.id] ?? (q.type === 'multi' ? [] : '');
        const other = otherTexts[q.id] ?? '';
        if (q.type === 'single' && ans === '__other__') {
          ans = other || 'Other';
        } else if (q.type === 'multi' && Array.isArray(ans) && ans.includes('__other__')) {
          ans = [...ans.filter((v) => v !== '__other__'), other || 'Other'];
        }
        const description = descriptionTexts[q.id] ?? '';
        return {
          questionId: q.id,
          question: resolveQuestionText(q.id).title,
          answer: ans,
          ...(description ? { description } : {}),
        };
      });

      const chiefComplaintBase =
        answers['chief_complaint'] === '__other__'
          ? otherTexts['chief_complaint'] || 'Other'
          : (answers['chief_complaint'] as string) || 'General visit';
      const chiefComplaintDesc = descriptionTexts['chief_complaint'] ?? '';
      const chiefComplaint = chiefComplaintDesc
        ? `${chiefComplaintBase} — ${chiefComplaintDesc}`
        : chiefComplaintBase;

      const res = await fetch(`/api/intake/${intakeId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses: qaPairs, chiefComplaint }),
      });
      if (!res.ok) throw new Error('Failed to submit');
      setPhase('complete');
    } catch {
      setError(intake.errorLabel);
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setPhase('start');
    setIntakeId(null);
    setStepIndex(0);
    setAnswers({});
    setOtherTexts({});
    setDescriptionTexts({});
    setEmergencySymptom('');
    setError('');
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: `hsl(var(--background))` }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-40 px-6 py-4 shrink-0"
        style={{
          background: `hsl(var(--card) / 0.85)`,
          borderBottom: `1px solid hsl(var(--border-subtle) / 0.4)`,
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: `hsl(var(--primary) / 0.15)`, border: `1px solid hsl(var(--primary) / 0.3)` }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <span className="text-sm font-semibold text-foreground hidden sm:block" style={{ fontFamily: 'var(--font-heading)' }}>
              Acute Insight AI
            </span>
          </Link>

          {phase === 'questions' && (
            <div className="flex-1 mx-8 hidden sm:block">
              <ProgressBar current={stepIndex + 1} total={totalSteps} />
            </div>
          )}

          <button
            onClick={() => navigate('/portal')}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            My portal
          </button>
        </div>
      </header>

      {/* Mobile progress */}
      {phase === 'questions' && (
        <div className="sm:hidden px-6 pt-4">
          <ProgressBar current={stepIndex + 1} total={totalSteps} />
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait" custom={direction}>
            {phase === 'start' && (
              <StartScreen key="start" onStart={handleStart} onStartChat={handleStartChat} loading={submitting} />
            )}

            {phase === 'emergency' && (
              <EmergencyScreen
                key="emergency"
                symptomValue={emergencySymptom}
                onContinue={handleContinueFromEmergency}
              />
            )}

            {phase === 'chat' && intakeId !== null && (
              <ChatFlow
                key="chat"
                intakeId={intakeId}
                onComplete={() => setPhase('complete')}
                onBack={() => { setPhase('start'); setIntakeId(null); }}
              />
            )}

            {phase === 'questions' && currentQuestion && (
              <motion.div
                key={`step-${stepIndex}`}
                custom={direction}
                initial={{ opacity: 0, x: direction * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -40 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                {/* Question header */}
                <div className="mb-8">
                  <div
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-4"
                    style={{
                      background: `hsl(var(--primary) / 0.08)`,
                      color: `hsl(var(--primary))`,
                      border: `1px solid hsl(var(--primary) / 0.2)`,
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                    </svg>
                    AI Intake
                  </div>
                  <h2
                    className="text-2xl font-bold text-foreground mb-2"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {resolveQuestionText(currentQuestion.id).title}
                  </h2>
                  <p className="text-muted-foreground text-sm" style={{ fontFamily: 'var(--font-sans)' }}>
                    {resolveQuestionText(currentQuestion.id).subtitle}
                  </p>
                </div>

                {/* Answer area */}
                <StepView
                  question={currentQuestion}
                  answer={currentAnswer}
                  otherText={currentOther}
                  descriptionText={currentDescription}
                  onAnswer={handleAnswer}
                  onOtherText={handleOtherText}
                  onDescriptionText={handleDescriptionText}
                />

                {/* Error */}
                {error && (
                  <p className="text-sm mt-4" style={{ color: `hsl(var(--destructive))`, fontFamily: 'var(--font-sans)' }}>
                    {error}
                  </p>
                )}

                {/* Navigation */}
                <div className="flex gap-3 mt-8">
                  <button
                    onClick={handleBack}
                    className="px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200"
                    style={{
                      background: `hsl(var(--card))`,
                      color: `hsl(var(--foreground))`,
                      border: `1px solid hsl(var(--border-subtle) / 0.5)`,
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    {intake.backButton}
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={!canAdvance() || submitting}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-40"
                    style={{
                      background: canAdvance() ? `hsl(var(--primary))` : `hsl(var(--muted))`,
                      color: canAdvance() ? `hsl(var(--background))` : `hsl(var(--muted-foreground))`,
                      fontFamily: 'var(--font-heading)',
                      boxShadow: canAdvance() ? `0 0 20px hsl(var(--primary) / 0.2)` : 'none',
                    }}
                  >
                    {submitting
                      ? intake.savingLabel
                      : stepIndex === totalSteps - 1
                      ? intake.submitButton
                      : intake.nextButton}
                  </button>
                </div>
              </motion.div>
            )}

            {phase === 'complete' && (
              <CompleteScreen key="complete" onReset={handleReset} />
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function IntakePage() {
  return (
    <>
      <Helmet>
        <title>Patient Intake — Acute Insight AI</title>
        <meta name="description" content="Complete your pre-visit intake questionnaire. AI-guided, private, and done in minutes." />
        <meta name="robots" content="noindex" />
      </Helmet>
      <ProtectedRoute>
        <IntakeFlow />
      </ProtectedRoute>
    </>
  );
}
