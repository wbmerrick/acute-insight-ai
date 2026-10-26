import type { Request, Response } from 'express';
import { eq, desc, isNull, and } from 'drizzle-orm';
import { db } from '../../../db/client.js';
import { checkins, intakeSessions, user } from '../../../db/schema.js';
import { requireClinician, logErr } from '../../../lib/dispatch.js';
import { visiblePatientIds } from '../../../lib/scope.js';

/** Escalated check-ins nobody has acknowledged yet — the provider's "needs attention" list. */
export default async function handler(req: Request, res: Response) {
  try {
    const ctx = await requireClinician(req, res);
    if (!ctx) return;
    const rows = await db
      .select({
        id: checkins.id,
        intakeSessionId: checkins.intakeSessionId,
        followupIntakeId: checkins.followupIntakeId,
        outcome: checkins.outcome,
        escalationNote: checkins.escalationNote,
        answeredAt: checkins.answeredAt,
        chiefComplaint: intakeSessions.chiefComplaint,
        providerName: intakeSessions.providerName,
        patientName: user.name,
        patientEmail: user.email,
        patientId: user.id,
      })
      .from(checkins)
      .innerJoin(intakeSessions, eq(intakeSessions.id, checkins.intakeSessionId))
      .innerJoin(user, eq(user.id, checkins.patientUserId))
      .where(and(eq(checkins.status, 'escalated'), isNull(checkins.acknowledgedAt)))
      .orderBy(desc(checkins.answeredAt))
      .limit(50);
    const allowed = await visiblePatientIds(ctx.userId, ctx.isAdmin);
    const scoped = allowed ? rows.filter((r) => allowed.has(r.patientId)) : rows;
    res.json(scoped.map((r) => ({ ...r, answeredAt: r.answeredAt ? r.answeredAt.toISOString() : null })));
  } catch (error) {
    logErr('provider.checkins.error', error);
    res.status(500).json({ error: 'Failed to load escalations' });
  }
}
