import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../../../db/client.js';
import { clinicianProfiles, clinicianOnlineLog } from '../../../db/schema.js';
import { and, isNull } from 'drizzle-orm';
import { requireClinician, isUsState, SCOPE_OPTIONS, licensesOf, logErr } from '../../../lib/dispatch.js';
import { requireRecentAuth } from '../../../lib/reauth.js';
import type { Acuity } from '../../../../lib/clinical-brief.js';
import { toE164 } from '../../../lib/sms.js';
import { audit } from '../../../lib/audit.js';

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
    if (typeof body.phone === 'string') {
      const raw = body.phone.trim();
      if (raw && !toE164(raw)) return res.status(400).json({ error: 'Enter a valid US mobile number' });
      patch.phone = raw ? toE164(raw) : null;
    }
    if (typeof body.notifySms === 'boolean') patch.notifySms = body.notifySms;
    if (typeof body.online === 'boolean') {
      // Going online without a license on file is a routing hazard, not a preference.
      const licenses = (patch.stateLicenses ?? ctx.profile.stateLicenses) as unknown;
      if (body.online && (!Array.isArray(licenses) || licenses.length === 0)) {
        return res.status(400).json({ error: 'Add at least one state license before going online' });
      }
      patch.online = body.online;
      patch.lastSeenAt = new Date();
    }

    // Licensure, scope and credential decide which patients this clinician can
    // see — changing them is sensitive and needs a fresh password confirmation.
    // Going online/offline and contact details stay friction-free.
    const sameSet = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join(',') === [...b].sort().join(',');
    const changesLicensure =
      (patch.stateLicenses !== undefined && !sameSet(patch.stateLicenses as string[], licensesOf(ctx.profile))) ||
      (patch.maxAcuity !== undefined && patch.maxAcuity !== (ctx.profile.maxAcuity ?? 'urgent')) ||
      (patch.credential !== undefined && patch.credential !== (ctx.profile.credential ?? null));
    if (changesLicensure && !(await requireRecentAuth(req, res))) return;

    const [updated] = await db
      .update(clinicianProfiles)
      .set(patch)
      .where(eq(clinicianProfiles.userId, ctx.userId))
      .returning();

    // Online-session log — the honest denominator for "visits per online hour".
    if (typeof patch.online === 'boolean' && patch.online !== !!ctx.profile.online) {
      const now = new Date();
      if (patch.online) {
        await db.insert(clinicianOnlineLog).values({ userId: ctx.userId, wentOnlineAt: now });
      } else {
        await db.update(clinicianOnlineLog).set({ wentOfflineAt: now }).where(and(eq(clinicianOnlineLog.userId, ctx.userId), isNull(clinicianOnlineLog.wentOfflineAt)));
      }
    }

    audit(req, { action: typeof body.online === 'boolean' ? (body.online ? 'clinician.online' : 'clinician.offline') : 'clinician.profile.update', actorUserId: ctx.userId, actorRole: ctx.isAdmin ? 'admin' : 'provider', resourceType: 'clinician', resourceId: ctx.userId, meta: { states: (updated.stateLicenses as string[] | null)?.join(',') ?? null, scope: updated.maxAcuity ?? null } });
    res.json({
      displayName: updated.displayName,
      credential: updated.credential,
      stateLicenses: Array.isArray(updated.stateLicenses) ? updated.stateLicenses : [],
      maxAcuity: updated.maxAcuity ?? 'urgent',
      online: !!updated.online,
      phone: updated.phone,
      notifySms: updated.notifySms !== false,
    });
  } catch (error) {
    logErr('dispatch.me.put.error', error);
    res.status(500).json({ error: 'Failed to update clinician profile' });
  }
}
