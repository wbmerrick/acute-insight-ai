import type { Request, Response } from 'express';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../../../../../db/client.js';
import { checkins } from '../../../../../db/schema.js';
import { requirePatient, logErr, publicBaseUrl } from '../../../../../lib/dispatch.js';
import { notifyClinicianOfEscalation } from '../../../../../lib/companion.js';

/**
 * One-tap answer. "better" closes the loop. "same" and "worse" are recorded and
 * the UI then hands the patient to Ace (the follow-up intake completes the
 * check-in and decides escalation). "worse" is marked escalated immediately so
 * the provider sees it even if the patient never finishes talking to Ace.
 */
export default async function handler(req: Request, res: Response) {
  try {
    const userId = await requirePatient(req, res);
    if (!userId) return;
    const id = Number(req.params.id);
    const { outcome } = (req.body ?? {}) as { outcome?: string };
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid check-in id' });
    if (outcome !== 'better' && outcome !== 'same' && outcome !== 'worse') return res.status(400).json({ error: 'outcome must be better, same or worse' });

    const [row] = await db
      .update(checkins)
      .set({
        outcome,
        answeredAt: new Date(),
        status: outcome === 'better' ? 'answered' : outcome === 'worse' ? 'escalated' : 'sent',
        escalationNote: outcome === 'worse' ? 'Patient reports worse since the visit.' : undefined,
      })
      .where(and(eq(checkins.id, id), eq(checkins.patientUserId, userId), inArray(checkins.status, ['scheduled', 'sent'])))
      .returning({ id: checkins.id, status: checkins.status, intakeSessionId: checkins.intakeSessionId });
    if (!row) return res.status(404).json({ error: 'No open check-in' });
    res.json({ ok: true, ...row });
    if (outcome === 'worse') {
      void notifyClinicianOfEscalation({ intakeSessionId: row.intakeSessionId, patientUserId: userId, base: publicBaseUrl(req) });
    }
  } catch (error) {
    logErr('companion.answer.error', error);
    res.status(500).json({ error: 'Failed to record answer' });
  }
}
