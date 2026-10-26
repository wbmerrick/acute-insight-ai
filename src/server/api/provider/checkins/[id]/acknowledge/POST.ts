import type { Request, Response } from 'express';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../../../../../db/client.js';
import { checkins } from '../../../../../db/schema.js';
import { requireClinician, logErr } from '../../../../../lib/dispatch.js';
import { audit } from '../../../../../lib/audit.js';

export default async function handler(req: Request, res: Response) {
  try {
    const ctx = await requireClinician(req, res);
    if (!ctx) return;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid check-in id' });
    const [row] = await db
      .update(checkins)
      .set({ acknowledgedBy: ctx.userId, acknowledgedAt: new Date() })
      .where(and(eq(checkins.id, id), eq(checkins.status, 'escalated'), isNull(checkins.acknowledgedAt)))
      .returning({ id: checkins.id, patientUserId: checkins.patientUserId });
    if (!row) return res.status(404).json({ error: 'Nothing to acknowledge' });
    audit(req, { action: 'checkin.acknowledge', actorUserId: ctx.userId, actorRole: ctx.isAdmin ? 'admin' : 'provider', resourceType: 'checkin', resourceId: id, patientUserId: row.patientUserId });
    res.json({ ok: true });
  } catch (error) {
    logErr('provider.checkins.ack.error', error);
    res.status(500).json({ error: 'Failed to acknowledge' });
  }
}
