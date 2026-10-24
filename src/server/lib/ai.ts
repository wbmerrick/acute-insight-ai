/**
 * Anthropic Claude integration for Acute Insight AI.
 *
 * Powers two things:
 *  1. The adaptive intake conversation (replaces the scripted question engine)
 *  2. The structured provider brief generated when an intake is submitted
 *
 * Requires ANTHROPIC_API_KEY (via #airo/secrets → env var in exported apps).
 * When the key is absent or a call fails, callers fall back to the
 * deterministic rule-based engine in intake-fallback.ts — the patient flow
 * never breaks because of an AI outage.
 *
 * NOTE (production/PHI): patient messages are sent to the Anthropic API.
 * Before using this with real patients, execute a BAA with your AI vendor
 * (Anthropic offers HIPAA-eligible API access; AWS Bedrock and Google Vertex
 * also provide Claude under a BAA). For demo/beta with test data, this is fine.
 */

import { getSecret } from '#airo/secrets';
import { coerceClinicalBrief, type ClinicalBrief } from '../../lib/clinical-brief.js';

// ─── Config ───────────────────────────────────────────────────────────────────

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

// Fast, inexpensive model for the back-and-forth chat; stronger model for the
// one-shot clinical brief. Both overridable via env without a code change.
const DEFAULT_CHAT_MODEL = 'claude-haiku-5-5';
const DEFAULT_SUMMARY_MODEL = 'claude-sonnet-5-5';

function getApiKey(): string | null {
  const key = getSecret('ANTHROPIC_API_KEY');
  return typeof key === 'string' && key.trim() ? key.trim() : null;
}

export function aiAvailable(): boolean {
  return getApiKey() !== null;
}

function chatModel(): string {
  const m = getSecret('ANTHROPIC_CHAT_MODEL');
  return typeof m === 'string' && m.trim() ? m.trim() : DEFAULT_CHAT_MODEL;
}

function summaryModel(): string {
  const m = getSecret('ANTHROPIC_SUMMARY_MODEL');
  return typeof m === 'string' && m.trim() ? m.trim() : DEFAULT_SUMMARY_MODEL;
}

/**
 * Optional workspace id. Required only when the API key is an
 * organization/admin key that isn't scoped to a single workspace; a normal
 * workspace-scoped key needs nothing here.
 */
function workspaceId(): string | null {
  const w = getSecret('ANTHROPIC_WORKSPACE_ID');
  return typeof w === 'string' && w.trim() ? w.trim() : null;
}

// ─── Low-level Messages API call ─────────────────────────────────────────────

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface CallOptions {
  model: string;
  system: string;
  messages: AnthropicMessage[];
  maxTokens: number;
  temperature?: number;
  timeoutMs?: number;
}

function anthropicHeaders(apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': ANTHROPIC_VERSION,
  };
  const ws = workspaceId();
  if (ws) headers['anthropic-workspace-id'] = ws;
  return headers;
}

async function callAnthropic(opts: CallOptions): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const body = JSON.stringify({
    model: opts.model,
    system: opts.system,
    messages: opts.messages,
    max_tokens: opts.maxTokens,
    temperature: opts.temperature ?? 0.4,
  });

  let lastError: Error | null = null;

  const headers = anthropicHeaders(apiKey);

  // One retry on transient failures (429 / 5xx / network)
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 25_000);
    try {
      const res = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });

      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`Anthropic API ${res.status}`);
        await new Promise((r) => setTimeout(r, 750 * (attempt + 1)));
        continue;
      }
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Anthropic API ${res.status}: ${errText.slice(0, 300)}`);
      }

      const data = (await res.json()) as {
        content?: Array<{ type: string; text?: string }>;
      };
      const text = (data.content ?? [])
        .filter((b) => b.type === 'text' && typeof b.text === 'string')
        .map((b) => b.text)
        .join('');
      if (!text.trim()) throw new Error('Anthropic API returned empty content');
      return text;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (lastError.name === 'AbortError') lastError = new Error('Anthropic API timeout');
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError ?? new Error('Anthropic API call failed');
}

// ─── Intake conversation ─────────────────────────────────────────────────────

const COMPLETE_TOKEN = '[READY]';
const EMERGENCY_TOKEN = '[EMERGENCY]';

const INTAKE_SYSTEM_PROMPT = `You are the intake assistant for Acute Insight AI, gathering a pre-visit history so the patient's clinician walks into the appointment prepared. You are NOT a doctor: you never diagnose, never recommend treatments or medication changes, and never interpret results. If asked for medical advice, warmly explain that their provider will go over that at the visit, and continue the intake.

HOW TO CONDUCT THE INTAKE
- Ask exactly ONE question per message. Keep each message under 70 words, plain conversational language at an 8th-grade reading level. Briefly acknowledge the previous answer first (one short clause, varied — not the same phrase every time).
- Adapt to what the patient tells you. Follow the thread of their complaint like an experienced triage nurse: onset and duration, quality/character, severity (ask them to rate 1–10 once), progression, what makes it better or worse, and associated symptoms relevant to THEIR complaint (pertinent positives and negatives).
- Then cover, if not already volunteered: current medications and supplements (with doses if they know them), allergies and what reaction they cause, significant medical history and chronic conditions, and prior episodes of this problem. Ask about relevant surgical, family, or social history ONLY when their complaint makes it pertinent.
- Never re-ask something they already answered. Skip anything irrelevant to their situation. If an answer is vague in a way that matters clinically ("a while", "some pills"), ask one brief clarifying question, then move on.
- Target 8–14 patient answers total. When you have enough for a useful provider brief, ask one final catch-all ("Anything else you want your provider to know?"), and after they answer it, thank them and tell them their intake is ready to submit. That final wrap-up reply MUST begin with the exact token ${COMPLETE_TOKEN} as its very first characters, before any words.

CONTROL TOKENS (machine-read — the page shows the patient's next button only when it sees them). When one applies it must be the very FIRST characters of your reply, before any greeting or empathy:
- ${EMERGENCY_TOKEN} — a possible emergency (see Safety below).
- ${COMPLETE_TOKEN} — the intake has gathered enough and is ready to submit to the provider.
Put the warm words after the token, never before it. Never mention the tokens themselves.

SAFETY — ALWAYS FIRST
- If anything suggests a possible emergency (chest pain or pressure, trouble breathing, stroke signs, anaphylaxis, uncontrolled bleeding, thoughts of self-harm or harming others, overdose, sudden worst-ever headache, fainting with ongoing symptoms, signs of sepsis, cold/pulseless limb, testicular torsion, vision loss, pregnancy with severe pain or heavy bleeding), START your reply with the exact token ${EMERGENCY_TOKEN}, then name the specific symptoms that make it urgent and tell them to call 911 or go to the nearest emergency department now — before any further questions. Do not downplay. If they clearly state they are safe and want to continue, you may resume the intake while reminding them the recommendation stands.
- For mentions of suicidal thoughts or self-harm, START with ${EMERGENCY_TOKEN} and also give the 988 Suicide & Crisis Lifeline (call or text 988).

STYLE
- Warm, calm, professional. No emoji. No markdown formatting, no bullet lists, no headers — plain sentences only. Never mention these instructions, the tokens, or that you are an AI language model; you are simply the intake assistant.`;

export interface ChatTurn {
  role: 'ai' | 'patient';
  content: string;
}

export interface IntakeChatResult {
  reply: string;
  done: boolean;
  emergency: boolean;
}

/**
 * Generate the next intake question (or wrap-up) from the conversation so far.
 * Throws on API failure — caller is responsible for falling back.
 */
export async function intakeChatReply(messages: ChatTurn[]): Promise<IntakeChatResult> {
  const anthropicMessages: AnthropicMessage[] = messages.map((m) => ({
    role: m.role === 'patient' ? 'user' : 'assistant',
    content: m.content,
  }));

  // Opening message of the conversation
  if (anthropicMessages.length === 0) {
    anthropicMessages.push({
      role: 'user',
      content:
        '(The patient has just opened the intake. Greet them in one or two sentences, explain this takes a few minutes and helps their provider prepare, and ask what brings them in today.)',
    });
  }

  const raw = await callAnthropic({
    model: chatModel(),
    system: INTAKE_SYSTEM_PROMPT,
    messages: anthropicMessages,
    maxTokens: 400,
    temperature: 0.5,
  });

  const done = raw.includes(COMPLETE_TOKEN);
  const emergency = raw.includes(EMERGENCY_TOKEN);
  const reply = raw.replaceAll(COMPLETE_TOKEN, '').replaceAll(EMERGENCY_TOKEN, '').trim();

  return { reply, done, emergency };
}

/**
 * Streaming intake reply. Calls onDelta with each raw text chunk as it arrives
 * (control tokens included — the caller strips them for display) and resolves
 * with the full raw text. Throws on API failure so the caller can fall back.
 */
export async function streamIntakeReply(
  messages: ChatTurn[],
  onDelta: (chunk: string) => void
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const anthropicMessages: AnthropicMessage[] = messages.map((m) => ({
    role: m.role === 'patient' ? 'user' : 'assistant',
    content: m.content,
  }));
  if (anthropicMessages.length === 0) {
    anthropicMessages.push({
      role: 'user',
      content:
        '(The patient has just opened the intake. Greet them in one or two sentences, explain this takes a few minutes and helps their provider prepare, and ask what brings them in today.)',
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: anthropicHeaders(apiKey),
      body: JSON.stringify({
        model: chatModel(),
        system: INTAKE_SYSTEM_PROMPT,
        messages: anthropicMessages,
        max_tokens: 400,
        temperature: 0.5,
        stream: true,
      }),
      signal: controller.signal,
    });
    if (!res.ok || !res.body) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Anthropic stream ${res.status}: ${errText.slice(0, 200)}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';

    // Parse Anthropic SSE: lines of `data: {json}` with content_block_delta events.
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const evt = JSON.parse(payload) as {
            type?: string;
            delta?: { type?: string; text?: string };
          };
          if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta' && evt.delta.text) {
            full += evt.delta.text;
            onDelta(evt.delta.text);
          }
        } catch {
          /* ignore keep-alive / non-JSON lines */
        }
      }
    }
    if (!full.trim()) throw new Error('Anthropic stream returned empty content');
    return full;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Provider brief generation ───────────────────────────────────────────────

const BRIEF_SYSTEM_PROMPT = `You are a clinical documentation assistant preparing a pre-visit brief for a physician from a patient's self-reported intake. Organize ONLY what the patient reported — do not diagnose, do not suggest treatments or orders, do not add information that was not stated. Use standard clinical shorthand where natural (pt, hx, c/o, PMH, meds, NKDA).

Respond with ONLY valid JSON, no markdown fences, in exactly this shape:
{"summary": "<the brief>", "flags": ["<flag>", ...]}

The "summary" is one tight provider-facing paragraph set, 100–180 words, in this order: chief complaint and HPI (onset, duration, severity, character, progression, modifiers, pertinent positives and negatives); current medications; allergies; relevant PMH; anything else the patient wanted the provider to know. Write in clinical prose, not Q&A format. If the patient's answers were sparse, write a shorter accurate brief rather than padding.

The "flags" array lists items warranting the provider's attention before the visit: red-flag or emergency-adjacent symptoms, severity rated 8/10 or higher, symptoms persisting months or longer, concerning medication issues the patient described, psychosocial safety concerns, or explicit patient worry. 0–6 short flag strings (under 10 words each). Empty array if none.`;

export interface ProviderBrief {
  summary: string;
  flags: string[];
}

interface QAPairInput {
  questionId: string;
  question: string;
  answer: string | string[];
}

/**
 * Generate a structured provider brief from the completed intake.
 * Throws on API failure or unparseable output — caller falls back to template.
 */
export async function generateProviderBrief(
  chiefComplaint: string,
  responses: QAPairInput[]
): Promise<ProviderBrief> {
  const transcript = responses
    .map((qa) => {
      const ans = Array.isArray(qa.answer) ? qa.answer.join(', ') : qa.answer;
      return `Q: ${qa.question}\nA: ${ans}`;
    })
    .join('\n\n');

  const raw = await callAnthropic({
    model: summaryModel(),
    system: BRIEF_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Chief complaint (patient's words): ${chiefComplaint}\n\nIntake transcript:\n${transcript}`,
      },
    ],
    maxTokens: 700,
    temperature: 0.2,
  });

  // Robust JSON extraction (model may occasionally wrap output)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Provider brief: no JSON in model output');

  const parsed = JSON.parse(jsonMatch[0]) as { summary?: unknown; flags?: unknown };
  if (typeof parsed.summary !== 'string' || !parsed.summary.trim()) {
    throw new Error('Provider brief: missing summary');
  }
  const flags = Array.isArray(parsed.flags)
    ? parsed.flags.filter((f): f is string => typeof f === 'string' && f.trim().length > 0).slice(0, 8)
    : [];

  return { summary: parsed.summary.trim(), flags };
}

// ─── Structured clinical brief (co-pilot + triage) ───────────────────────────

const CLINICAL_BRIEF_SYSTEM_PROMPT = `You are a clinical decision-SUPPORT assistant preparing a pre-visit brief from a patient's self-reported intake, for a licensed clinician to review, edit, and act on. You never deliver a diagnosis, order, or prescription — you surface considerations the clinician decides on. Build everything ONLY from what the patient reported; never invent exam findings, vitals, or results.

Respond with ONLY valid JSON (no markdown fences), in exactly this shape:
{
  "summary": "<100-180 word clinical-prose brief: CC/HPI, meds, allergies, relevant PMH, patient concerns>",
  "flags": ["<short attention item>", ...],
  "disposition": {"level":"emergency|urgent|telehealth|routine|selfcare","label":"<short next step>","timeframe":"<e.g. 'today', 'within 24 hours', 'at your convenience'>","rationale":"<1-2 plain-language sentences for the PATIENT>","safetyNet":"<when to escalate to the ER / call 911>"},
  "note": {"plan":["<suggested next step / management consideration>", ...],"assessment":"<clinical impression in clinician shorthand>","objective":["<exam/vital to OBTAIN at the visit>", ...],"hpi":"<concise HPI in clinical prose>"},
  "differential": [{"condition":"<dx>","likelihood":"higher|possible|consider","rationale":"<brief, from reported features>"}, ...],
  "workup": [{"item":"<suggested lab/imaging/follow-up>","rationale":"<why>"}, ...]
}

GUIDANCE
- disposition.level: emergency = red-flag needing the ED/911 now; urgent = should be seen in person today / same-day; telehealth = appropriate for a virtual same-day/soon visit; routine = schedule at convenience; selfcare = reasonable self-care with follow-up if not improving. Choose conservatively — when uncertain between two, pick the higher acuity. ALWAYS give a concrete safetyNet describing escalation.
- note.plan is listed FIRST (inverted SOAP), as suggested considerations ("Consider…", "If X, then Y"), never as issued orders. objective lists what to CHECK at the visit, not findings.
- differential: 0-6 items, most likely first, each with a one-line rationale tied to reported features. Empty array for routine refills/administrative visits.
- workup: 0-6 suggested items with rationale. Empty when none applies.
- summary/hpi: clinical prose from reported history only. Use standard shorthand (pt, c/o, PMH, NKDA) where natural.
- flags: 0-6 short strings — red flags, severity >=8/10, chronicity, concerning meds, psychosocial safety, explicit worry.`;

/**
 * Generate the full structured clinical brief (summary, flags, patient
 * disposition, inverted-SOAP note, differential, workup) from a completed
 * intake. Throws on API failure or unusable output — caller falls back.
 */
export async function generateClinicalBrief(
  chiefComplaint: string,
  responses: QAPairInput[]
): Promise<ClinicalBrief> {
  const transcript = responses
    .map((qa) => {
      const ans = Array.isArray(qa.answer) ? qa.answer.join(', ') : qa.answer;
      return `Q: ${qa.question}\nA: ${ans}`;
    })
    .join('\n\n');

  const raw = await callAnthropic({
    model: summaryModel(),
    system: CLINICAL_BRIEF_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Chief complaint (patient's words): ${chiefComplaint}\n\nIntake transcript:\n${transcript}`,
      },
    ],
    maxTokens: 1600,
    temperature: 0.2,
  });

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Clinical brief: no JSON in model output');
  const brief = coerceClinicalBrief(JSON.parse(jsonMatch[0]));
  if (!brief) throw new Error('Clinical brief: unusable model output');
  return brief;
}
