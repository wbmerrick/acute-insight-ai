/**
 * Deterministic fallback intake engine.
 *
 * Used when ANTHROPIC_API_KEY is not configured or the Claude API is
 * unreachable, so the patient-facing intake never hard-fails. Covers the core
 * history topics in a fixed, clinically sensible order.
 */

import type { ClinicalBrief, Acuity } from '../../lib/clinical-brief.js';

export interface ChatTurn {
  role: 'ai' | 'patient';
  content: string;
}

/**
 * Emergency patterns — the deterministic 911 screen. Each entry is a regex
 * (source string) matched case-insensitively. `neverSuppress` entries fire on
 * any mention, even negated ("I'm not suicidal" still surfaces 988/911 — the
 * accepted over-triage for self-harm). Kept in sync with the client-side
 * pre-screen in src/pages/intake/index.tsx; the server is the authority.
 */
export const EMERGENCY_PATTERNS: { re: RegExp; neverSuppress?: boolean; label: string }[] = [
  // cardiac
  { re: /\bchest (pain|pressure|tightness|tight|heaviness|heavy|discomfort|squeez|hurts?|hurting|aches?|aching)|\bmy chest (is )?(hurting|killing me)/i, label: 'chest pain/pressure' },
  { re: /\bcrushing (chest|pain)|\belephant on my chest|\bheart attack\b/i, label: 'heart attack' },
  // breathing / airway
  { re: /\bcan'?t (breathe?|breath good|catch my breath|get (a|enough|any) (breath|air))|\bcannot breathe?|\bnot breathing|\bstopped breathing|\bgasping\b|\bstruggling to breathe?|\bhard to breathe? (at rest|sitting|lying|laying)/i, label: 'cannot breathe' },
  { re: /\b(lips?|face|fingers?|skin|nails?)[^.]{0,25}\b(blue|purple|gr[ae]y|dusky)\b|\bblue (lips|in the face)\b|\bturning blue/i, label: 'cyanosis' },
  { re: /\b(throat|toung|tounge|tongue|lips?)[^.]{0,15}\b(closing|tight|thick|swelling|swollen|swell)/i, label: 'airway swelling' },
  { re: /\banaphyla|\bepipen (used|injected)|\bused my epipen|\bhives[^.]{0,60}(tongue|toung|throat|breath|swell)/i, label: 'anaphylaxis' },
  // neuro
  { re: /\bstroke\b|\bface (is |looks )?(droop|dropp|uneven|lopsided|crooked)|\b(droop|dropp)(ing|y)?[^.]{0,15}(face|mouth|eyelid|side)|\bslurr(ed|ing)|\btalking funny|\bspeech (is )?(funny|off|strange|garbled)|\bcan'?t (speak|talk|get (my )?words|talk right)|\bsudden(ly)? (weak|numb)|\b(weakness|numbness) (on|in|of) (one|my (right|left)) (side|arm|leg)|\bone side of (my|his|her) (body|face)|\bcan'?t (move|lift|hold) (my )?(arm|leg|cup)/i, label: 'stroke signs' },
  { re: /\bseizure|\bconvuls|\bfitting\b|\bwors[te] ?(head ?ache?|headach)|\bthunderclap|\b(headache|headach)[^.]{0,40}(stiff neck|neck (is )?stiff)|\bstiff neck[^.]{0,40}headach/i, label: 'seizure / thunderclap headache' },
  { re: /\bunconscious|\bunresponsive|\bnot waking up|\bwon'?t wake up|\bpassed out|\bblacked out|\bfainted|\blost consciousness|\bcollapsed\b/i, label: 'loss of consciousness' },
  { re: /\bparaly[sz]|\bcan'?t feel my (legs|arms|body)|\bcan'?t move my (legs|arms)/i, label: 'paralysis' },
  // bleeding / GI
  { re: /\b(vomit(ing|ed)?|throw(ing|n)? up|threw up) .{0,25}blood|\bblood in (my |the )?vomit|\bcoffee.?ground|\bcoughing up blood|\bcough(ed|ing)? .{0,10}blood|\bblack (tarry )?stools?/i, label: 'GI bleeding' },
  { re: /\b(severe|heavy|uncontrolled|won'?t stop|can'?t stop) bleeding|\bbleeding (heavily|a lot|won'?t stop)|\bgunshot|\bstabbed|\bstab wound/i, label: 'major bleeding / trauma' },
  // toxic
  { re: /\boverdos|\btook (a whole|the whole|all (of )?my|too many|a bottle of)|\bswallowed (bleach|poison|pills)|\bpoison(ed|ing)\b/i, label: 'overdose / poisoning' },
  // self-harm — never suppressed
  { re: /\bsu[ic]{1,2}id|\bkill(ing)? my ?self|\bend (my|it all|my life)|\btake my (own )?life|\bdon'?t want to (be here|be alive|live|wake up)|\bbetter off (dead|without me)|\bhurt(ing)? my ?self|\bharm(ing)? my ?self|\bself.?harm|\bplan to (die|kill)|\bending my life/i, neverSuppress: true, label: 'self-harm' },
  // pregnancy / pediatric red lines
  { re: /\b(baby|infant|newborn|toddler|my \d+ ?(week|day|month|year) old|son|daughter|child|kid)[^.]{0,80}(not breathing|blue|limp|floppy|unresponsive|won'?t wake|hard to wake|difficult to wake|can'?t wake)/i, label: 'child: unresponsive / cyanotic' },
  { re: /\b(barking|seal|croupy) cough[^.]{0,100}(noise|stridor|whistl|pull|retract|struggl)|\bstridor|\bhigh.?pitched (noise|sound)[^.]{0,40}breath|\bpulling in (at|around|under) (the |her |his )?(ribs|chest)|\bretractions/i, label: 'child: stridor / respiratory distress' },
  { re: /\b(hit|bump(ed)?|struck|smacked) (his|her|my|their) head[^.]{0,150}(vomit|thrown up|threw up|confus|not (acting|making sense)|won'?t wake|seizure|passed out)|\bhead injury[^.]{0,100}(vomit|confus)/i, label: 'head injury with red flags' },
  { re: /\b(does not|doesn'?t|won'?t|did not|didn'?t) (fade|blanch|go away|disappear)[^.]{0,40}(glass|press)|\bglass test|\bpurple (spotty |spots |spotted |)rash|\brash[^.]{0,50}(purple|dark red|doesn'?t fade|does not fade|non.?blanching)/i, label: 'non-blanching rash' },
  { re: /\bbutton battery|\bswallowed (a |an |some )?(battery|batteries|magnet)/i, label: 'button battery / magnet ingestion' },
  { re: /\bpregnan[^.]{0,120}(seeing spots|spots in my vision|blurry vision|vision change|severe headache|bad headache|worst headache|swollen (hands|face)|face (is )?swollen)|\b(seeing spots|severe headache|bad headache)[^.]{0,120}pregnan/i, label: 'pregnancy: preeclampsia signs' },
  { re: /\bsoak(ed|ing|s) (a |through |\d+ |one |two )?pads?|\bbleeding (heavily|a lot|through)[^.]{0,30}pad/i, label: 'heavy vaginal bleeding' },
  { re: /\bvoices? (are |is )?(telling|told|saying)[^.]{0,40}(hurt|kill|harm)|\b(hurt|kill|harm) (my (roommate|wife|husband|kids?|children|family|mother|father|baby)|someone|somebody|other people|them|him|her)\b|\bscared i (might|will|could) (hurt|do it)/i, label: 'harm to others / command hallucinations' },
  { re: /\b(stopped|quit|haven'?t had a|no) (drinking|alcohol|drink)[^.]{0,200}(hallucinat|seeing (things|bugs|people)|bugs on|shaking and sweating|seizure)|\b(see|saw|seeing) (bugs|things|people) (on the wall |)?that (are|were|aren'?t|weren'?t|wasn'?t) (not )?(there|real)/i, label: 'alcohol withdrawal with hallucinations' },
  { re: /\bfell[^.]{0,120}(leg|hip)[^.]{0,80}(shorter|turned out|rotated)|\b(leg|foot) (looks|is|seems) (shorter|turned out|rotated)|\bhip[^.]{0,40}(fracture|broke)/i, label: 'hip fracture pattern' },
];

/** @deprecated kept for callers that list keywords; patterns are the source of truth. */
export const EMERGENCY_KEYWORDS = EMERGENCY_PATTERNS.map((p) => p.label);

const COVERED_TOPICS = [
  'chief_complaint', 'duration', 'severity', 'associated', 'medications',
  'allergies', 'history', 'notes',
] as const;

type Topic = (typeof COVERED_TOPICS)[number];

// Contexts in which an emergency keyword is NOT the patient's own current problem.
// Applied only to the text immediately before an occurrence (tight windows), so a
// real mention elsewhere still fires. Over-triage is the safe error.
// Family HISTORY needs the verb: "my dad had a heart attack". "My father fell / is confused" is a caregiver
// reporting something happening now, and must not be suppressed.
const FAMILY_HX_CTX = /\b(dad|mom|father|mother|parent|grandparent|grand(father|mother|pa|ma)|brother|sister|sibling|uncle|aunt|cousin|relative)('?s)?\s+(had|has had|have had|got|died of|died from|has|have|with)\s+(a\s+|an\s+)?$/;
// …unless the text right after says it's happening now.
const CURRENT_AFTER = /^[^.]{0,50}\b(right now|currently|today|just now|at the moment|this morning|an hour ago|minutes ago|since (this|last|an hour|yesterday)|is having|and (is|can'?t|cannot|won'?t))/;
const HISTORY_CTX = /\b(family history of|fhx(\s+of)?|hx\s+of|history of|previous|prior|past)\s+(a\s+|an\s+)?$/;
const NEGATION_CTX = /\b(no|not|without|denies?|deny|negative for|never had|never have|never)\s+(a\s+|an\s+|any\s+|the\s+)?$/;
// Self-harm is only stood down by an explicit, tight denial ("not suicidal", "no thoughts of hurting myself").
// Even then the brief carries a flag and the safety net keeps 988. Family/past/long-ago contexts never suppress it.
const SELF_HARM_DENIAL_CTX = /\b((am|i'?m|is|are|was)\s+not|no|not having|without|denies?|deny)\s+(any\s+|current\s+|active\s+)?((thoughts?|ideas?|ideation|plans?|intention|urges?|feelings?)\s+(of|to|about)\s+|)$/;
// "I had a stroke two years ago" / "in 2019" — a resolved past event, not now. (Hours/days ago still fires.)
const LONG_AGO_AFTER = /^[^.]{0,30}\b((\d+|two|three|four|five|six|seven|eight|nine|ten|several|many|few|couple of) (years?|months?|weeks?) ago|in (19|20)\d\d|years ago|when i was)/;

/**
 * True if the text mentions an emergency symptom as the patient's OWN current
 * problem. Occurrences that are clearly family history, past history, or negated
 * are skipped; if any occurrence is unqualified, it fires (over-triage is safe).
 */
export function detectEmergency(text: string): boolean {
  for (const p of EMERGENCY_PATTERNS) {
    const re = new RegExp(p.re.source, p.re.flags.includes('g') ? p.re.flags : p.re.flags + 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const before = text.slice(Math.max(0, m.index - 32), m.index).toLowerCase();
      if (p.neverSuppress) {
        if (SELF_HARM_DENIAL_CTX.test(before)) continue; // explicit denial — flagged, not 911
        return true;
      }
      const after = text.slice(m.index + m[0].length, m.index + m[0].length + 40).toLowerCase();
      const suppressed =
        (FAMILY_HX_CTX.test(before) && !CURRENT_AFTER.test(after)) || HISTORY_CTX.test(before) || NEGATION_CTX.test(before) || LONG_AGO_AFTER.test(after);
      if (!suppressed) return true;
      if (m[0].length === 0) re.lastIndex++;
    }
  }
  return false;
}

/** Self-harm mentioned anywhere (even denied) — the clinician should see it. */
export function mentionsSelfHarm(text: string): boolean {
  const p = EMERGENCY_PATTERNS.find((x) => x.neverSuppress);
  return !!p && p.re.test(text);
}

function extractCoveredTopics(messages: ChatTurn[]): Set<Topic> {
  const covered = new Set<Topic>();
  for (const msg of messages) {
    if (msg.role !== 'ai') continue;
    const t = msg.content.toLowerCase();
    if (t.includes('how long') || t.includes('when did') || t.includes('started')) covered.add('duration');
    if (t.includes('scale of') || t.includes('rate') || t.includes('1 to 10') || t.includes('1–10')) covered.add('severity');
    if (t.includes('other symptom') || t.includes('anything else') || t.includes('associated')) covered.add('associated');
    if (t.includes('medication') || t.includes('currently taking')) covered.add('medications');
    if (t.includes('allerg')) covered.add('allergies');
    if (t.includes('medical history') || t.includes('chronic') || t.includes('past medical')) covered.add('history');
    if (t.includes('anything else') && covered.size >= 5) covered.add('notes');
  }
  if (messages.some((m) => m.role === 'patient')) covered.add('chief_complaint');
  return covered;
}

function nextQuestion(covered: Set<Topic>, lastPatientMessage: string): string {
  const lower = lastPatientMessage.toLowerCase();

  if (!covered.has('duration')) {
    return 'How long have you been experiencing this? Did it come on suddenly or gradually?';
  }
  if (!covered.has('severity')) {
    return "On a scale of 1 to 10 — where 1 is barely noticeable and 10 is the worst you've ever felt — how would you rate the severity right now?";
  }
  if (!covered.has('associated')) {
    return 'Are you noticing any other symptoms alongside this? For example: fever, nausea, dizziness, shortness of breath, or anything else unusual?';
  }
  if (!covered.has('medications')) {
    return 'Are you currently taking any medications, supplements, or vitamins? If so, which ones?';
  }
  if (!covered.has('allergies')) {
    return 'Do you have any known allergies — to medications, foods, or anything else?';
  }
  if (!covered.has('history')) {
    return 'Do you have any significant medical history I should know about? For example: diabetes, hypertension, heart disease, asthma, or any chronic conditions?';
  }

  if (lower.includes('stress') || lower.includes('anxious') || lower.includes('worried')) {
    return 'You mentioned stress or anxiety — has anything changed recently in your life that might be contributing to how you\'re feeling?';
  }
  if (lower.includes('worse') || lower.includes('getting worse')) {
    return 'You mentioned it\'s getting worse — is there anything that seems to make it better or worse? For example, certain activities, foods, positions, or times of day?';
  }
  if (lower.includes('sleep') || lower.includes('tired') || lower.includes('fatigue')) {
    return 'How has your sleep been? Are you getting enough rest, or has this condition been affecting your sleep?';
  }

  if (!covered.has('notes')) {
    return "Is there anything else you'd like me to know before I put together your intake summary for the provider? Any recent travel, life changes, or concerns you haven't mentioned?";
  }

  return '__done__';
}

export function buildWelcome(): string {
  return "Hi, I'm your intake assistant. I'll ask you a few questions to help your provider understand what's going on before your visit — it usually takes just a few minutes.\n\nTo start: what's bringing you in today? Please describe your main concern in your own words.";
}

export function buildEmergencyResponse(): string {
  return "⚠️ What you've described may be a medical emergency. Please call 911 or go to your nearest emergency room immediately.\n\nDo not wait for an online consultation — emergency symptoms require in-person care right away. If you are having thoughts of harming yourself, you can also call or text the 988 Suicide & Crisis Lifeline.\n\nIf you believe you are safe and want to continue your intake anyway, please tell me more about your situation.";
}

function buildDoneResponse(): string {
  return "Thank you — I have everything I need to prepare a thorough brief for your provider. Your intake is ready to submit. Click **Submit intake** below when you're ready, or feel free to add anything else first.";
}

function buildFollowUp(covered: Set<Topic>, lastMessage: string): string {
  const next = nextQuestion(covered, lastMessage);
  if (next === '__done__') return buildDoneResponse();

  const acks = [
    'Got it.',
    'Thanks for sharing that.',
    'Understood.',
    'Noted.',
    "That's helpful.",
    'I appreciate you telling me that.',
  ];
  const ack = acks[Math.floor(Math.random() * acks.length)];
  return `${ack} ${next}`;
}

export interface FallbackChatResult {
  reply: string;
  done: boolean;
}

/** Produce the next scripted intake reply (no LLM). */
export function fallbackChatReply(messages: ChatTurn[]): FallbackChatResult {
  const lastPatient = [...messages].reverse().find((m) => m.role === 'patient');
  if (!lastPatient) return { reply: buildWelcome(), done: false };

  const covered = extractCoveredTopics(messages);
  const next = nextQuestion(covered, lastPatient.content);
  const done = next === '__done__';
  const reply = done ? buildDoneResponse() : buildFollowUp(covered, lastPatient.content);
  return { reply, done };
}

// ─── Template provider summary (fallback for the LLM brief) ──────────────────

interface QAPair {
  questionId: string;
  question: string;
  answer: string | string[];
}

export function buildTemplateSummary(
  chiefComplaint: string,
  responses: QAPair[]
): { summary: string; flags: string[] } {
  const summaryParts: string[] = [];
  const flags: string[] = [];

  for (const qa of responses) {
    const ans = Array.isArray(qa.answer) ? qa.answer.join(', ') : qa.answer;
    if (!ans || ans === 'None' || ans === 'No') continue;

    if (qa.questionId === 'severity') {
      const num = parseInt(ans, 10);
      summaryParts.push(`Symptom severity rated ${ans}/10.`);
      if (num >= 8) flags.push('High severity (≥8/10)');
    } else if (qa.questionId === 'duration') {
      summaryParts.push(`Duration: ${ans}.`);
      if (ans.includes('month') || ans.includes('year')) flags.push('Chronic symptom duration');
    } else if (qa.questionId === 'associated') {
      summaryParts.push(`Associated symptoms: ${ans}.`);
      const serious = ['Chest pain', 'Shortness of breath', 'Fainting', 'Severe headache'];
      const found = (Array.isArray(qa.answer) ? qa.answer : [qa.answer]).filter((a) =>
        serious.includes(a)
      );
      if (found.length > 0) flags.push(`Serious associated symptom: ${found.join(', ')}`);
    } else if (qa.questionId === 'medications') {
      summaryParts.push(`Current medications: ${ans}.`);
    } else if (qa.questionId === 'allergies') {
      summaryParts.push(`Known allergies: ${ans}.`);
    } else if (qa.questionId === 'history') {
      summaryParts.push(`Chronic conditions: ${ans}.`);
    } else if (qa.questionId === 'notes' && ans.trim()) {
      summaryParts.push(`Additional notes: ${ans}.`);
    } else if (qa.questionId.startsWith('chat_turn_')) {
      // Free-text chat transcript pairs — include the answer content directly
      summaryParts.push(`${ans}.`);
    }
  }

  const summary =
    summaryParts.length > 0
      ? `Patient presents with chief complaint: ${chiefComplaint}. ${summaryParts.join(' ')}`
      : `Patient presents with chief complaint: ${chiefComplaint}.`;

  // Self-harm language anywhere in the intake — denied or not — is always surfaced to the clinician.
  const everything = [chiefComplaint, ...responses.map((q) => (Array.isArray(q.answer) ? q.answer.join(' ') : q.answer))].join(' ');
  if (mentionsSelfHarm(everything)) {
    flags.push(detectEmergency(everything) ? 'Self-harm ideation expressed — emergency path shown' : 'Self-harm mentioned and denied — screen directly at the visit');
  }

  return { summary, flags };
}

/**
 * Deterministic structured clinical brief (fallback for the LLM version).
 * Produces an honest, conservative triage disposition and a template note from
 * the reported history — no speculative differential/workup (the clinician
 * fills those in). Keeps the co-pilot + triage features working without the AI.
 */
export function buildTemplateClinicalBrief(
  chiefComplaint: string,
  responses: QAPair[]
): ClinicalBrief {
  const { summary, flags } = buildTemplateSummary(chiefComplaint, responses);

  const blob =
    (chiefComplaint + ' ' + responses.map((r) => (Array.isArray(r.answer) ? r.answer.join(' ') : r.answer)).join(' '));
  const isEmergency = detectEmergency(blob);
  // Conservative: concerning descriptions in free-text chat bump to "urgent"
  // (be seen today) even without a numeric severity. Over-triage is the safe error.
  const CONCERNING =
    /chest (pain|tight|pressure|discomfort)|short(ness)? of breath|difficulty breathing|hard to breathe|radiat|numbness|weak(ness)?|slurred|vision (loss|change)|faint|pass(ed|ing) out|severe|worst|uncontrolled bleeding|coughing up blood|high fever|stiff neck|new confusion|severe dehydrat|fever (of |to |at |around |about )?(10[1-9]|11\d)|(shaking|teeth.chattering) chills|rigors|flank pain|(back|side) pain .{0,40}fever|fever .{0,40}(back|side) pain|blood in (my |the )?(urine|stool|pee)|can'?t keep (anything|fluids|water) down|vomiting .{0,20}(blood|days)|(hard|difficult|painful) to swallow .{0,30}(swollen|swelling|neck|drool)|drool|(swollen|swelling) .{0,20}neck|not (urinat|pee)ing|haven'?t (urinated|peed) in|worst headache|(infant|newborn|baby) .{0,30}fever|pregnan.{0,30}(bleeding|pain)|(bleeding|pain).{0,30}pregnan|testic|scrot|(sudden|severe) abdominal|belly .{0,20}(rigid|hard)|can'?t walk|can'?t bear weight|(red|hot) streak|spreading redness|lower right (belly|abdomen|side|quadrant)|pain .{0,60}moved to (the )?(lower|right|left)|(belly|abdominal|stomach) pain .{0,40}fever|fever .{0,40}(belly|abdominal|stomach) pain|(calf|leg)[^.]{0,40}(swollen|swelling)[^.]{0,50}(warm|hot|painful|tender)|(swollen|swelling)[^.]{0,20}(calf|leg)[^.]{0,40}(warm|hot|painful|tender)|(unable|not able|can'?t|haven'?t been able) to (urinate|pee|pass urine|empty my bladder)|sugar[^.]{0,20}(over|above) [34]\d\d|(blood )?sugar[^.]{0,15}(400|500|600)|(not|haven'?t|hasn'?t) felt (the |my )?baby move|baby (hasn'?t|has not|isn'?t|is not|stopped) (moved|moving)|(decreased|less|no) (fetal|baby) move|(sudden(ly)?|new(ly)?|acute(ly)?) confus|confused since (this morning|last night|yesterday|today)|(does not|doesn'?t) know what (day|year) it is|(warfarin|coumadin|eliquis|xarelto|pradaxa|blood thinner|anticoag)[^.]{0,150}(hit|bump|struck|fell)[^.]{0,30}head|(hit|bump|struck)[^.]{0,20}head[^.]{0,150}(warfarin|coumadin|eliquis|xarelto|pradaxa|blood thinner|anticoag)|haven'?t slept in (\d+|three|four|five|six) (days|nights)|(no|not) sleep(ing)? (for|in) (\d+|three|four|five) (days|nights)|spent (my|all my|our) (savings|money)|(family|wife|husband|parents) say[s]? i am not making sense|foul.?smelling (discharge|drainage)[^.]{0,60}(fever|pain)|fever[^.]{0,60}foul.?smelling|no wet diaper in|(not|hasn'?t) (peed|urinated|had a wet diaper) in \d+ hours|(cant|can'?t) stand up straight/i;
  // Drop short negated phrases ("no chest pain", "denies fever") so an explicitly
  // absent symptom doesn't trip the concerning-symptom scan.
  const denegBlob = blob.replace(/\b(no|not|without|denies?|deny|negative for|never had)\b(\s+\w+){0,3}/gi, ' ');
  // Phrases where the negation IS the symptom — matched on the raw text, before negation stripping.
  const URGENT_RAW = /(not|haven'?t|hasn'?t|no longer|can'?t) (felt|feel)[^.]{0,12}(the |my |any )?baby (move|moving|kick)|baby (hasn'?t|has not|isn'?t|is not|stopped) (moved|moving|kicking)|no wet diaper|(no|not|hasn'?t) (peed|urinated|passed urine|had a wet diaper)[^.]{0,20}(hours|since|all day)|(unable|not able|can'?t|haven'?t been able) to (urinate|pee|pass urine)/i;
  const isUrgent = flags.some((f) => /high severity|serious associated/i.test(f)) || CONCERNING.test(denegBlob) || URGENT_RAW.test(blob);

  let level: Acuity;
  let label: string, timeframe: string, rationale: string, safetyNet: string;
  if (isEmergency) {
    level = 'emergency';
    label = 'Call 911 or go to the ER now';
    timeframe = 'now';
    rationale = 'Some of what you described may need emergency care right away.';
    safetyNet = 'If you have chest pain, trouble breathing, weakness on one side, or feel you are in danger, call 911 now. For thoughts of self-harm, call or text 988.';
  } else if (isUrgent) {
    level = 'urgent';
    label = 'Be seen today';
    timeframe = 'today';
    rationale = 'Based on what you shared, it would be best to be evaluated today.';
    safetyNet = 'Go to the ER or call 911 if your symptoms suddenly worsen, or you develop chest pain, trouble breathing, or fainting.';
  } else {
    level = 'routine';
    label = 'Routine scheduled visit';
    timeframe = 'at your convenience';
    rationale = 'Your provider will review your intake and go over everything at your visit.';
    safetyNet = 'Seek urgent care or call 911 if your symptoms suddenly worsen, or you develop chest pain, trouble breathing, or confusion.';
  }

  return {
    summary,
    flags,
    disposition: { level, label, timeframe, rationale, safetyNet },
    note: {
      plan: ['Clinician to review the reported history and determine the plan at the visit.'],
      assessment: 'Pending clinician evaluation — see HPI.',
      objective: ['Vital signs', 'Focused exam relevant to the chief complaint'],
      hpi: summary,
    },
    differential: [],
    workup: [],
  };
}
