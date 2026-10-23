import type { Request, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../../../db/client.js';
import { intakeSessions } from '../../../db/schema.js';
import { getAuth } from '../../../../lib/auth/auth.js';
import { aiAvailable, streamIntakeReply, type ChatTurn } from '../../../lib/ai.js';
import {
  detectEmergency,
  buildEmergencyResponse,
  buildWelcome,
  fallbackChatReply,
} from '../../../lib/intake-fallback.js';

interface ChatRequest {
  messages: ChatTurn[];
  intakeId?: number | null;
}

const MAX_MESSAGES = 80;
const MAX_MESSAGE_LENGTH = 4000;
const GUEST_TURNS = 2; // patient messages allowed before an account is required

/** Count patient turns, ignoring the hidden "Visit basics" account preamble. */
function patientTurns(messages: ChatTurn[]): number {
  return messages.filter((m) => m.role === 'patient' && !/^Visit basics/i.test(m.content)).length;
}

export default async function handler(req: Request, res: Response) {
  try {
    const session = await getAuth()
      .api.getSession({ headers: new Headers(req.headers as Record<string, string>) })
      .catch(() => null);

    const { messages, intakeId } = req.body as ChatRequest;
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }
    if (messages.length > MAX_MESSAGES) {
      return res.status(400).json({ error: 'Conversation too long' });
    }
    for (const m of messages) {
      if (
        !m ||
        (m.role !== 'ai' && m.role !== 'patient') ||
        typeof m.content !== 'string' ||
        m.content.length > MAX_MESSAGE_LENGTH
      ) {
        return res.status(400).json({ error: 'Invalid message format' });
      }
    }

    // ── Guest gate ──
    // A signed-out visitor may send a few messages, then must create an account.
    if (!session?.user) {
      if (patientTurns(messages) > GUEST_TURNS) {
        return res.status(401).json({ error: 'account_required' });
      }
    } else if (intakeId != null) {
      // Signed in with a session id: it must belong to them.
      const id = Number(intakeId);
      if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid intake ID' });
      const [owned] = await db
        .select({ id: intakeSessions.id })
        .from(intakeSessions)
        .where(and(eq(intakeSessions.id, id), eq(intakeSessions.userId, session.user.id)))
        .limit(1);
      if (!owned) return res.status(404).json({ error: 'Intake session not found' });
    }

    // ── Stream raw text (control tokens included; the client strips them) ──
    res.status(200);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Accel-Buffering', 'no');

    const lastPatient = [...messages].reverse().find((m) => m.role === 'patient');

    // Deterministic emergency screen — always runs first, independent of the model.
    if (lastPatient && detectEmergency(lastPatient.content)) {
      res.write('[EMERGENCY] ' + buildEmergencyResponse());
      return res.end();
    }

    // AI path (streaming)
    if (aiAvailable()) {
      let wroteAny = false;
      try {
        await streamIntakeReply(messages, (chunk) => {
          wroteAny = true;
          res.write(chunk);
        });
        return res.end();
      } catch (err) {
        console.error(
          JSON.stringify({
            event: 'intake.chat.ai_fallback',
            error: err instanceof Error ? err.message : String(err),
          })
        );
        if (wroteAny) return res.end(); // partial already sent; don't double-write
        // else fall through to scripted
      }
    }

    // Scripted fallback — emit the same control tokens so the client behaves identically.
    if (messages.length === 0 || !lastPatient) {
      res.write(buildWelcome());
      return res.end();
    }
    const fb = fallbackChatReply(messages);
    res.write((fb.done ? '[READY] ' : '') + fb.reply);
    return res.end();
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'intake.chat.error',
        error: error instanceof Error ? error.message : String(error),
      })
    );
    if (res.headersSent) {
      try { res.end(); } catch { /* noop */ }
    } else {
      res.status(500).json({ error: 'Chat failed' });
    }
  }
}
