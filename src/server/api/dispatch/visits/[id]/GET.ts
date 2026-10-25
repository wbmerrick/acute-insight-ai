import type { Request, Response } from 'express';
import { and, eq, count } from 'drizzle-orm';
import { db } from '../../../../db/client.js';
import { visits, clinicianProfiles } from '../../../../db/schema.js';
import { requirePatient, logErr } from '../../../../lib/dispatch.js';

/** Patient polls this while waiting: queued → accepted (by whom) → completed. */
export default async function handler(req: Request, res: Response) {
  try {
    const userId = await requirePatient(req, res);
    if (!userId) return;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid visit id' });

    const [v] = await db
      .select({
        id: visits.id,
        status: visits.status,
        acuity: visits.acuity,
        patientState: visits.patientState,
        queuedAt: visits.queuedAt,
        acceptedAt: visits.acceptedAt,
        completedAt: visits.completedAt,
        clinicianName: clinicianProfiles.displayName,
        clinicianCredential: clinicianProfiles.credential,
      })
      .from(visits)
      .leftJoin(clinicianProfiles, eq(clinicianProfiles.userId, visits.clinicianUserId))
      .where(and(eq(visits.id, id), eq(visits.patientUserId, userId)))
      .limit(1);
    if (!v) return res.status(404).json({ error: 'Visit not found' });

    // How many licensed clinicians are online in the patient's state right now — honest, not a fake ETA.
    const [{ n }] = await db
      .select({ n: count() })
      .from(clinicianProfiles)
      .where(and(eq(clinicianProfiles.online, true)));
    const online = await db.select({ licenses: clinicianProfiles.stateLicenses }).from(clinicianProfiles).where(eq(clinicianProfiles.online, true));
    const inState = online.filter((c) => Array.isArray(c.licenses) && c.licenses.includes(v.patientState)).length;

    const iso = (d: Date | null) => (d ? d.toISOString() : null);
    res.json({
      ...v,
      queuedAt: iso(v.queuedAt),
      acceptedAt: iso(v.acceptedAt),
      completedAt: iso(v.completedAt),
      cliniciansOnlineInState: inState,
      cliniciansOnline: Number(n),
    });
  } catch (error) {
    logErr('dispatch.visit.get.error', error);
    res.status(500).json({ error: 'Failed to load visit' });
  }
}
