import type { Request, Response } from 'express';
import { and, eq } from 'drizzle-orm';
import { db } from '../../../../../db/client.js';
import { visits } from '../../../../../db/schema.js';
import { requireClinician, licensesOf, scopeCovers, logErr } from '../../../../../lib/dispatch.js';

/** First clinician to accept wins. The UPDATE's WHERE status='queued' is the lock. */
export default async function handler(req: Request, res: Response) {
  try {
    const ctx = await requireClinician(req, res);
    if (!ctx) return;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid visit id' });
    if (!ctx.profile.online) return res.status(409).json({ error: 'Go online to accept visits' });

    const [visit] = await db.select().from(visits).where(eq(visits.id, id)).limit(1);
    if (!visit) return res.status(404).json({ error: 'Visit not found' });

    // Licensure and scope are re-checked server-side — never trust the client's filtered view.
    if (!licensesOf(ctx.profile).includes(visit.patientState)) {
      return res.status(403).json({ error: `Not licensed in ${visit.patientState}` });
    }
    if (!scopeCovers(ctx.profile.maxAcuity, visit.acuity)) {
      return res.status(403).json({ error: 'Outside your accepted scope' });
    }

    const [accepted] = await db
      .update(visits)
      .set({ status: 'accepted', clinicianUserId: ctx.userId, acceptedAt: new Date() })
      .where(and(eq(visits.id, id), eq(visits.status, 'queued')))
      .returning({ id: visits.id });

    if (!accepted) return res.status(409).json({ error: 'Another clinician already accepted this visit' });
    res.json({ ok: true, id: accepted.id });
  } catch (error) {
    logErr('dispatch.accept.error', error);
    res.status(500).json({ error: 'Failed to accept visit' });
  }
}
