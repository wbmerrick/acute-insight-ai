import type { Request, Response } from 'express';
import { db } from '../../../../db/client.js';
import { intakeSessions } from '../../../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { getAuth } from '../../../../../lib/auth/auth.js';
import { aiAvailable, generateProviderBrief } from '../../../../lib/ai.js';
import { buildTemplateSummary } from '../../../../lib/intake-fallback.js';

interface QAPair {
  questionId: string;
  question: string;
  answer: string | string[];
}

export default async function handler(req: Request, res: Response) {
  try {
    const session = await getAuth().api.getSession({
      headers: new Headers(req.headers as Record<string, string>),
    });
    if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });

    const intakeId = Number(req.params.id);
    if (isNaN(intakeId)) return res.status(400).json({ error: 'Invalid intake ID' });

    const { responses, chiefComplaint } = req.body as {
      responses: QAPair[];
      chiefComplaint: string;
    };
    if (!Array.isArray(responses) || typeof chiefComplaint !== 'string') {
      return res.status(400).json({ error: 'responses array and chiefComplaint required' });
    }

    // Verify ownership before doing any work
    const [existing] = await db
      .select({ id: intakeSessions.id, status: intakeSessions.status })
      .from(intakeSessions)
      .where(and(eq(intakeSessions.id, intakeId), eq(intakeSessions.userId, session.user.id)))
      .limit(1);
    if (!existing) return res.status(404).json({ error: 'Intake session not found' });

    // Deterministic flags always run (severity ≥8, chronicity, serious associated
    // symptoms) — the LLM augments them, it never replaces the safety floor.
    const template = buildTemplateSummary(chiefComplaint, responses);
    let aiSummary = template.summary;
    let flags = template.flags;

    if (aiAvailable()) {
      try {
        const brief = await generateProviderBrief(chiefComplaint, responses);
        aiSummary = brief.summary;
        // Union of deterministic + LLM flags, deduplicated
        flags = [...new Set([...template.flags, ...brief.flags])];
      } catch (err) {
        console.error(
          JSON.stringify({
            event: 'intake.complete.ai_fallback',
            error: err instanceof Error ? err.message : String(err),
          })
        );
      }
    }

    await db
      .update(intakeSessions)
      .set({
        status: 'complete',
        chiefComplaint,
        responses,
        aiSummary,
        aiFlags: flags.length > 0 ? flags : null,
      })
      .where(
        and(
          eq(intakeSessions.id, intakeId),
          eq(intakeSessions.userId, session.user.id)
        )
      );

    res.json({ ok: true, aiSummary, aiFlags: flags });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'intake.complete.error',
        error: error instanceof Error ? error.message : String(error),
      })
    );
    res.status(500).json({ error: 'Failed to complete intake' });
  }
}
