import type { Request, Response } from 'express';
import { and, eq } from 'drizzle-orm';
import { db } from '../../../../../db/client.js';
import { visits } from '../../../../../db/schema.js';
import { requireClinician, logErr } from '../../../../../lib/dispatch.js';
import { audit } from '../../../../../lib/audit.js';

/**
 * Put an accepted visit back in the queue (clinician can't take it after all).
 * The hold clock restarts so the sweep gives the next clinician a full window.
 * If the card was already captured it stays captured: the next clinician to accept
 * isn't charged again, and if nobody does, cancel/sweep refunds it.
 */
export default async function handler(req: Request, res: Response) {
  try {
    const ctx = await requireClinician(req, res);
    if (!ctx) return;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid visit id' });

    const [released] = await db
      .update(visits)
      .set({ status: 'queued', clinicianUserId: null, acceptedAt: null, queuedAt: new Date() })
      .where(and(eq(visits.id, id), eq(visits.status, 'accepted'), eq(visits.clinicianUserId, ctx.userId)))
      .returning({ id: visits.id, patientUserId: visits.patientUserId });
    if (!released) return res.status(404).json({ error: 'No accepted visit to release' });
    audit(req, { action: 'visit.release', actorUserId: ctx.userId, actorRole: ctx.isAdmin ? 'admin' : 'provider', resourceType: 'visit', resourceId: id, patientUserId: released.patientUserId });
    res.json({ ok: true });
  } catch (error) {
    logErr('dispatch.release.error', error);
    res.status(500).json({ error: 'Failed to release visit' });
  }
}
