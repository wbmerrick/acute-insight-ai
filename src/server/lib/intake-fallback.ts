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

export const EMERGENCY_KEYWORDS = [
  'chest pain', "can't breathe", 'cannot breathe', 'stroke', 'seizure',
  'unconscious', 'unresponsive', 'overdose', 'suicidal', 'kill myself',
  'heart attack', 'anaphylaxis', 'throat closing', 'paralyzed', 'paralysis',
];

const COVERED_TOPICS = [
  'chief_complaint', 'duration', 'severity', 'associated', 'medications',
  'allergies', 'history', 'notes',
] as const;

type Topic = (typeof COVERED_TOPICS)[number];

export function detectEmergency(text: string): boolean {
  const lower = text.toLowerCase();
  return EMERGENCY_KEYWORDS.some((kw) => lower.includes(kw));
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
    /chest (pain|tight|pressure|discomfort)|short(ness)? of breath|difficulty breathing|hard to breathe|radiat|numbness|weak(ness)?|slurred|vision (loss|change)|faint|pass(ed|ing) out|severe|worst|uncontrolled bleeding|coughing up blood|high fever|stiff neck|new confusion|severe dehydrat/i;
  const isUrgent = flags.some((f) => /high severity|serious associated/i.test(f)) || CONCERNING.test(blob);

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
