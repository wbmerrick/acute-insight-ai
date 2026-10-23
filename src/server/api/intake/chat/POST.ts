import type { Request, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../../../db/client.js';
import { intakeSessions } from '../../../db/schema.js';
import { getAuth } from '../../../../lib/auth/auth.js';
import { aiAvailable, intakeChatReply, type ChatTurn } from '../../../lib/ai.js';
import {
  detectEmergency,
  buildEmergencyResponse,
  buildWelcome,
  fallbackChatReply,
} from '../../../lib/intake-fallback.js';

interface ChatRequest {
  messages: ChatTurn[];
  intakeId: number;
}

const MAX_MESSAGES = 80;
const MAX_MESSAGE_LENGTH = 4000;

export default async function handler(req: Request, res: Response) {
  try {
    const session = await getAuth().api.getSession({
      headers: new Headers(req.headers as Record<string, string>),
    });
    if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });

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

    // Verify the intake session exists and belongs to this user
    if (intakeId !== undefined) {
      const id = Number(intakeId);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid intake ID' });
      }
      const [intake] = await db
        .select({ id: intakeSessions.id })
        .from(intakeSessions)
        .where(and(eq(intakeSessions.id, id), eq(intakeSessions.userId, session.user.id)))
        .limit(1);
      if (!intake) return res.status(404).json({ error: 'Intake session not found' });
    }

    // Deterministic emergency screen — always runs, even when the LLM is on,
    // so a patient describing an emergency is never dependent on model behavior.
    const lastPatient = [...messages].reverse().find((m) => m.role === 'patient');
    if (lastPatient && detectEmergency(lastPatient.content)) {
      return res.json({ reply: buildEmergencyResponse(), done: false, emergency: true });
    }

    // ── AI path ──
    if (aiAvailable()) {
      try {
        const result = await intakeChatReply(messages);
        return res.json({
          reply: result.reply,
          done: result.done,
          ...(result.emergency ? { emergency: true } : {}),
        });
      } catch (err) {
        // Fall through to the scripted engine — patient flow must not break.
        console.error(
          JSON.stringify({
            event: 'intake.chat.ai_fallback',
            error: err instanceof Error ? err.message : String(err),
          })
        );
      }
    }

    // ── Scripted fallback path ──
    if (messages.length === 0 || !lastPatient) {
      return res.json({ reply: buildWelcome(), done: false });
    }
    const fallback = fallbackChatReply(messages);
    return res.json({ reply: fallback.reply, done: fallback.done });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'intake.chat.error',
        error: error instanceof Error ? error.message : String(error),
      })
    );
    res.status(500).json({ error: 'Chat failed' });
  }
}
