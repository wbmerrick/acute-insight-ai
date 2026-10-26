import type { Request, Response } from 'express';
import { eq, desc } from 'drizzle-orm';
import { db } from '../../../db/client.js';
import { checkins, intakeSessions } from '../../../db/schema.js';
import { requirePatient, logErr } from '../../../lib/dispatch.js';

/**
 * The patient's check-ins. `pending` = the one Ace is asking about now (sent, or
 * scheduled-and-due so the portal can show it even before the text goes out).
 */
export default async function handler(req: Request, res: Response) {
  try {
    const userId = await requirePatient(req, res);
    if (!userId) return;
    const rows = await db
      .select({
        id: checkins.id,
        intakeSessionId: checkins.intakeSessionId,
        reason: checkins.reason,
        dueAt: checkins.dueAt,
        status: checkins.status,
        outcome: checkins.outcome,
        followupIntakeId: checkins.followupIntakeId,
        escalationNote: checkins.escalationNote,
        chiefComplaint: intakeSessions.chiefComplaint,
        intakeCreatedAt: intakeSessions.createdAt,
        providerName: intakeSessions.providerName,
      })
      .from(checkins)
      .innerJoin(intakeSessions, eq(intakeSessions.id, checkins.intakeSessionId))
      .where(eq(checkins.patientUserId, userId))
      .orderBy(desc(checkins.dueAt))
      .limit(20);
    const now = Date.now();
    const iso = (d: Date | null) => (d ? d.toISOString() : null);
    const all = rows.map((r) => ({ ...r, dueAt: iso(r.dueAt), intakeCreatedAt: iso(r.intakeCreatedAt) }));
    const pending = all.find((r) => r.status === 'sent' || (r.status === 'scheduled' && new Date(r.dueAt!).getTime() <= now)) ?? null;
    res.json({ pending, checkins: all });
  } catch (error) {
    logErr('companion.checkins.get.error', error);
    res.status(500).json({ error: 'Failed to load check-ins' });
  }
}
