import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../../../db/client.js';
import { clinicianProfiles } from '../../../db/schema.js';
import { requireClinician, isUsState, SCOPE_OPTIONS, logErr } from '../../../lib/dispatch.js';
import type { Acuity } from '../../../../lib/clinical-brief.js';

const CREDENTIALS = new Set(['MD', 'DO', 'NP', 'PA']);

export default async function handler(req: Request, res: Response) {
  try {
    const ctx = await requireClinician(req, res);
    if (!ctx) return;

    const body = (req.body ?? {}) as Record<string, unknown>;
    const patch: Partial<typeof clinicianProfiles.$inferInsert> = {};

    if (typeof body.displayName === 'string') patch.displayName = body.displayName.trim().slice(0, 160) || null;
    if (typeof body.credential === 'string') {
      const c = body.credential.toUpperCase();
      if (!CREDENTIALS.has(c)) return res.status(400).json({ error: 'credential must be MD, DO, NP or PA' });
      patch.credential = c;
    }
    if (Array.isArray(body.stateLicenses)) {
      const states = [...new Set(body.stateLicenses.filter(isUsState).map((s) => s.toUpperCase()))];
      patch.stateLicenses = states;
    }
    if (typeof body.maxAcuity === 'string') {
      if (!SCOPE_OPTIONS.includes(body.maxAcuity as Acuity)) return res.status(400).json({ error: 'maxAcuity must be urgent, telehealth or routine' });
      patch.maxAcuity = body.maxAcuity;
    }
    if (typeof body.online === 'boolean') {
      // Going online without a license on file is a routing hazard, not a preference.
      const licenses = (patch.stateLicenses ?? ctx.profile.stateLicenses) as unknown;
      if (body.online && (!Array.isArray(licenses) || licenses.length === 0)) {
        return res.status(400).json({ error: 'Add at least one state license before going online' });
      }
      patch.online = body.online;
      patch.lastSeenAt = new Date();
    }

    const [updated] = await db
      .update(clinicianProfiles)
      .set(patch)
      .where(eq(clinicianProfiles.userId, ctx.userId))
      .returning();

    res.json({
      displayName: updated.displayName,
      credential: updated.credential,
      stateLicenses: Array.isArray(updated.stateLicenses) ? updated.stateLicenses : [],
      maxAcuity: updated.maxAcuity ?? 'urgent',
      online: !!updated.online,
    });
  } catch (error) {
    logErr('dispatch.me.put.error', error);
    res.status(500).json({ error: 'Failed to update clinician profile' });
  }
}
