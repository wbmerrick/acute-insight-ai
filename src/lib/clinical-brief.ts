/**
 * Shared shape of the structured clinical brief Acute Insight produces from an
 * intake. Used by the AI generator (server), the deterministic fallback, the
 * stored record, and the patient + provider UI — one shape end to end.
 *
 * IMPORTANT (scope): this is decision *support*, produced from the patient's own
 * words for a licensed clinician to review, edit, and decide. The disposition is
 * conservative triage with a safety-net; the note/differential/workup are
 * suggestions, never a diagnosis, order, or prescription.
 */

export type Acuity = 'emergency' | 'urgent' | 'telehealth' | 'routine' | 'selfcare';
export type Likelihood = 'higher' | 'possible' | 'consider';

export interface Disposition {
  level: Acuity;
  label: string;       // e.g. "Same-day visit — telehealth or urgent care"
  timeframe: string;   // e.g. "today", "within 24 hours", "at your convenience"
  rationale: string;   // patient-facing, plain language, 1–2 sentences
  safetyNet: string;   // when to escalate to the ER / 911
}

export interface SoapNote {
  plan: string[];      // inverted SOAP: plan shown first
  assessment: string;
  objective: string[]; // to obtain at the visit (exam/vitals)
  hpi: string;
}

export interface DifferentialItem {
  condition: string;
  likelihood: Likelihood;
  rationale: string;
}

export interface WorkupItem {
  item: string;
  rationale: string;
}

export interface ClinicalBrief {
  summary: string;
  flags: string[];
  disposition: Disposition;
  note: SoapNote;
  differential: DifferentialItem[];
  workup: WorkupItem[];
  /** Who authored this brief: the model, or the deterministic fallback. Absent on briefs stored before 2026-10-29. */
  source?: 'model' | 'fallback';
}

export const ACUITY_LABEL: Record<Acuity, string> = {
  emergency: 'Emergency',
  urgent: 'Urgent',
  telehealth: 'Telehealth',
  routine: 'Routine',
  selfcare: 'Self-care',
};

// The five dispositions, highest-acuity first — used to validate model output.
export const ACUITY_LEVELS: Acuity[] = ['emergency', 'urgent', 'telehealth', 'routine', 'selfcare'];

/**
 * The safety-floor rule, as one testable function: the deterministic brief's
 * disposition is a FLOOR. The AI brief replaces the template (note, differential,
 * workup, summary) and may RAISE the disposition, never lower it; flags from both
 * are kept. Lower index in ACUITY_LEVELS = higher acuity.
 */
export function applyAcuityFloor(floorBrief: ClinicalBrief, aiBrief: ClinicalBrief): ClinicalBrief {
  const aiHigherOrEqual =
    ACUITY_LEVELS.indexOf(aiBrief.disposition.level) <= ACUITY_LEVELS.indexOf(floorBrief.disposition.level);
  return {
    ...aiBrief,
    flags: [...new Set([...floorBrief.flags, ...aiBrief.flags])],
    disposition: aiHigherOrEqual ? aiBrief.disposition : floorBrief.disposition,
    source: 'model',
  };
}
const LIKELIHOODS: Likelihood[] = ['higher', 'possible', 'consider'];

function str(v: unknown, max = 600): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}
function strArray(v: unknown, maxItems: number, maxLen = 300): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => str(x, maxLen)).filter((x) => x.length > 0).slice(0, maxItems);
}

/**
 * Validate/coerce an arbitrary parsed object (model output, or a row read back
 * from storage) into a well-formed ClinicalBrief, or null if it's unusable.
 * Never throws — safe to call on untrusted JSON.
 */
export function coerceClinicalBrief(raw: unknown): ClinicalBrief | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;

  const summary = str(o.summary, 2000);
  if (!summary) return null;

  const d = (o.disposition && typeof o.disposition === 'object' ? o.disposition : {}) as Record<string, unknown>;
  const level = ACUITY_LEVELS.includes(d.level as Acuity) ? (d.level as Acuity) : 'routine';
  const disposition: Disposition = {
    level,
    label: str(d.label, 160) || ACUITY_LABEL[level],
    timeframe: str(d.timeframe, 80),
    rationale: str(d.rationale, 600),
    safetyNet: str(d.safetyNet, 600),
  };

  const n = (o.note && typeof o.note === 'object' ? o.note : {}) as Record<string, unknown>;
  const note: SoapNote = {
    plan: strArray(n.plan, 10),
    assessment: str(n.assessment, 800),
    objective: strArray(n.objective, 12),
    hpi: str(n.hpi, 1200),
  };

  const differential: DifferentialItem[] = Array.isArray(o.differential)
    ? (o.differential as unknown[])
        .map((x) => {
          const it = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>;
          const condition = str(it.condition, 160);
          if (!condition) return null;
          const likelihood = LIKELIHOODS.includes(it.likelihood as Likelihood) ? (it.likelihood as Likelihood) : 'consider';
          return { condition, likelihood, rationale: str(it.rationale, 400) };
        })
        .filter((x): x is DifferentialItem => x !== null)
        .slice(0, 8)
    : [];

  const workup: WorkupItem[] = Array.isArray(o.workup)
    ? (o.workup as unknown[])
        .map((x) => {
          const it = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>;
          const item = str(it.item, 200);
          if (!item) return null;
          return { item, rationale: str(it.rationale, 400) };
        })
        .filter((x): x is WorkupItem => x !== null)
        .slice(0, 10)
    : [];

  const source = o.source === 'model' || o.source === 'fallback' ? o.source : undefined;
  return { summary, flags: strArray(o.flags, 8, 160), disposition, note, differential, workup, ...(source ? { source } : {}) };
}
