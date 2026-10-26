import type { Request, Response } from 'express';
import { db } from '../../../../db/client.js';
import { intakeSessions } from '../../../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { getAuth } from '../../../../../lib/auth/auth.js';
import { aiAvailable, generateClinicalBrief } from '../../../../lib/ai.js';
import { buildTemplateClinicalBrief } from '../../../../lib/intake-fallback.js';
import { ACUITY_LEVELS } from '../../../../../lib/clinical-brief.js';
import { scheduleCheckin, intakeCheckinReason, resolveCheckin, notifyClinicianOfEscalation } from '../../../../lib/companion.js';
import { audit } from '../../../../lib/audit.js';

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

    const { responses, chiefComplaint, checkinId, outcome } = req.body as {
      responses: QAPair[];
      chiefComplaint: string;
      checkinId?: number;                       // set when this intake answers a companion check-in
      outcome?: 'better' | 'same' | 'worse';    // what the patient tapped before talking to Ace
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

    // Deterministic brief always runs — a safety floor with a triage disposition
    // and flags. The LLM augments it into a full co-pilot brief when available,
    // but can never downgrade the disposition below the deterministic acuity.
    let brief = buildTemplateClinicalBrief(chiefComplaint, responses);
    const floor = brief.disposition;

    if (aiAvailable()) {
      try {
        const ai = await generateClinicalBrief(chiefComplaint, responses);
        const aiHigherOrEqual =
          ACUITY_LEVELS.indexOf(ai.disposition.level) <= ACUITY_LEVELS.indexOf(floor.level);
        brief = {
          ...ai,
          flags: [...new Set([...brief.flags, ...ai.flags])],
          disposition: aiHigherOrEqual ? ai.disposition : floor,
        };
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
        aiSummary: brief.summary,
        aiFlags: brief.flags.length > 0 ? brief.flags : null,
        aiBrief: brief,
      })
      .where(
        and(
          eq(intakeSessions.id, intakeId),
          eq(intakeSessions.userId, session.user.id)
        )
      );

    // Companion: this intake either answers a check-in (and may escalate) or earns one.
    let checkin: { escalated: boolean; note: string | null; intakeSessionId?: number } | null = null;
    try {
      if (Number.isInteger(checkinId)) {
        checkin = await resolveCheckin({
          checkinId: Number(checkinId),
          patientUserId: session.user.id,
          followupIntakeId: intakeId,
          followupBrief: brief,
          outcome: outcome ?? null,
        });
        if (checkin?.escalated && checkin.intakeSessionId) {
          void notifyClinicianOfEscalation({
            intakeSessionId: checkin.intakeSessionId,
            patientUserId: session.user.id,
            followupLevel: brief.disposition.level,
            base: process.env.PUBLIC_BASE_URL ?? `${req.protocol}://${req.hostname}`,
          });
        }
      } else {
        const reason = intakeCheckinReason(brief.disposition.level);
        if (reason) await scheduleCheckin(intakeId, session.user.id, reason);
      }
    } catch (err) {
      console.error(JSON.stringify({ event: 'intake.complete.checkin_failed', error: err instanceof Error ? err.message : String(err) }));
    }

    audit(req, { action: 'intake.complete', actorUserId: session.user.id, actorRole: 'patient', resourceType: 'intake', resourceId: intakeId, patientUserId: session.user.id, meta: { acuity: brief.disposition.level, checkinId: checkinId ?? null, escalated: checkin?.escalated ?? null } });
    res.json({ ok: true, aiSummary: brief.summary, aiFlags: brief.flags, disposition: brief.disposition, checkin });
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
