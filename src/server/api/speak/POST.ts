import type { Request, Response } from 'express';

/**
 * Text-to-speech for the intake assistant's spoken replies.
 * Ported from iSpry's /api/speak: primary path is the Vercel AI Gateway
 * (works with AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN, both available on Vercel).
 * Stateless — text is never stored. On any failure the client falls back to the
 * browser's built-in speech synthesis, so voice always works even with no key.
 */

const GATEWAY_SPEECH = 'https://ai-gateway.vercel.sh/v4/ai/speech-model';
const GOOGLE_VOICE = process.env.ACE_GOOGLE_VOICE || 'Aoede';
const OPENAI_VOICE = process.env.ACE_OPENAI_VOICE || 'nova';
const SPEECH_SPEED = Math.min(1.5, Math.max(0.7, Number(process.env.ACE_VOICE_SPEED || 1.15) || 1.15));
const NURSE_STYLE =
  process.env.ACE_VOICE_STYLE ||
  'Speak like a sweet, caring triage nurse: soft smile in the voice, warm and reassuring, gently expressive — never robotic, never stern.';
const MAX_CHARS = 900;

function gatewayAuth(): string {
  const key = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || '';
  return key ? `Bearer ${key}` : '';
}

function sanitize(text: unknown): string {
  return String(text || '')
    .replace(/\s*\[(EMERGENCY|READY)\]\s*/gi, ' ')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/[_`#]/g, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_CHARS);
}

function b64ToBuffer(b64: string): Buffer {
  return Buffer.from(String(b64 || ''), 'base64');
}

async function bufferFromAudioField(audio: unknown): Promise<Buffer> {
  if (!audio || typeof audio !== 'string') throw new Error('empty_audio');
  if (audio.startsWith('http://') || audio.startsWith('https://')) {
    const r = await fetch(audio);
    if (!r.ok) throw new Error(`audio_url: ${r.status}`);
    return Buffer.from(await r.arrayBuffer());
  }
  if (audio.startsWith('data:')) {
    const i = audio.indexOf('base64,');
    if (i === -1) throw new Error('bad_data_url');
    return b64ToBuffer(audio.slice(i + 7));
  }
  return b64ToBuffer(audio);
}

interface SpeechOpts {
  voice: string;
  outputFormat?: 'mp3' | 'wav';
  speed?: number;
  language?: string;
  instructions?: string;
}

async function synthesizeGatewaySpeech(
  text: string,
  model: string,
  opts: SpeechOpts
): Promise<{ buf: Buffer; contentType: string }> {
  const auth = gatewayAuth();
  if (!auth) throw new Error('gateway_missing');
  const r = await fetch(GATEWAY_SPEECH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: auth,
      'ai-gateway-protocol-version': '0.0.1',
      'ai-speech-model-specification-version': '4',
      'ai-model-id': model,
    },
    body: JSON.stringify({
      text,
      voice: opts.voice,
      outputFormat: opts.outputFormat || 'mp3',
      ...(opts.speed != null ? { speed: opts.speed } : {}),
      ...(opts.language ? { language: opts.language } : {}),
      ...(opts.instructions ? { instructions: opts.instructions } : {}),
    }),
  });
  const raw = await r.text();
  if (!r.ok) throw new Error(`${model}: ${r.status} ${raw.slice(0, 180)}`);
  const j = JSON.parse(raw) as { audio?: unknown; data?: { audio?: unknown } };
  const buf = await bufferFromAudioField(j?.audio || j?.data?.audio || '');
  return { buf, contentType: opts.outputFormat === 'wav' ? 'audio/wav' : 'audio/mpeg' };
}

export default async function handler(req: Request, res: Response) {
  try {
    const text = sanitize((req.body as { text?: unknown })?.text);
    if (!text) return res.status(400).json({ error: 'empty' });

    const attempts: Array<() => Promise<{ buf: Buffer; contentType: string }>> = [
      () =>
        synthesizeGatewaySpeech(text, 'google/gemini-3.8-flash-tts', {
          voice: GOOGLE_VOICE,
          outputFormat: 'wav',
          instructions: NURSE_STYLE,
        }),
      () =>
        synthesizeGatewaySpeech(text, 'openai/tts-1-hd', {
          voice: OPENAI_VOICE,
          outputFormat: 'mp3',
          speed: SPEECH_SPEED,
          language: 'en',
          instructions: NURSE_STYLE,
        }),
      () =>
        synthesizeGatewaySpeech(text, 'openai/tts-1', {
          voice: OPENAI_VOICE,
          outputFormat: 'mp3',
          speed: SPEECH_SPEED,
          language: 'en',
          instructions: NURSE_STYLE,
        }),
    ];

    for (const run of attempts) {
      try {
        const out = await run();
        if (out.buf && out.buf.length > 0) {
          res.setHeader('Content-Type', out.contentType);
          res.setHeader('Cache-Control', 'no-store');
          return res.end(out.buf);
        }
      } catch {
        /* try next provider */
      }
    }

    // No server voice available (e.g. no gateway key) — client falls back to
    // the browser's own speech synthesis.
    return res.status(502).json({ error: 'tts_unavailable' });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'speak.error',
        error: error instanceof Error ? error.message : String(error),
      })
    );
    if (!res.headersSent) res.status(500).json({ error: 'tts_failed' });
  }
}
