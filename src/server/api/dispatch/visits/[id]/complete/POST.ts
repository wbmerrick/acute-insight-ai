import type { Request, Response } from 'express';
import { and, eq } from 'drizzle-orm';
import { db } from '../../../../../db/client.js';
import { visits, intakeSessions } from '../../../../../db/schema.js';
import { requireClinician, logErr } from '../../../../../lib/dispatch.js';

export default async function handler(req: Request, res: Response) {
  try {
    const ctx = await requireClinician(req, res);
    if (!ctx) return;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid visit id' });

    const [done] = await db
      .update(visits)
      .set({ status: 'completed', completedAt: new Date() })
      .where(and(eq(visits.id, id), eq(visits.status, 'accepted'), eq(visits.clinicianUserId, ctx.userId)))
      .returning({ id: visits.id, intakeSessionId: visits.intakeSessionId });
    if (!done) return res.status(404).json({ error: 'No active visit to complete' });

    // Stamp the intake with who saw the patient so the portal timeline shows it.
    const name = ctx.profile.displayName?.trim();
    if (name) {
      await db.update(intakeSessions).set({ providerName: name }).where(eq(intakeSessions.id, done.intakeSessionId));
    }
    res.json({ ok: true });
  } catch (error) {
    logErr('dispatch.complete.error', error);
    res.status(500).json({ error: 'Failed to complete visit' });
  }
}
