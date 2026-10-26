import type { Request, Response } from 'express';
import { and, eq, inArray, asc, desc, sql } from 'drizzle-orm';
import { db } from '../../../db/client.js';
import { visits, intakeSessions, user, patientProfiles, clinicianProfiles } from '../../../db/schema.js';
import { requireClinician, licensesOf, scopeCovers, logErr } from '../../../lib/dispatch.js';
import { ACUITY_LEVELS } from '../../../../lib/clinical-brief.js';
import { audit } from '../../../lib/audit.js';

/**
 * The clinician's live view:
 *   queue  — visits waiting that this clinician is licensed + scoped to take,
 *            highest acuity first, then longest wait.
 *   active — the visits this clinician has accepted and not yet completed,
 *            with the full brief and patient contact.
 */
export default async function handler(req: Request, res: Response) {
  try {
    const ctx = await requireClinician(req, res);
    if (!ctx) return;

    // Heartbeat — a clinician polling the queue is present.
    await db
      .update(clinicianProfiles)
      .set({ lastSeenAt: new Date() })
      .where(eq(clinicianProfiles.userId, ctx.userId));

    const licenses = licensesOf(ctx.profile);
    const allowedAcuities = ACUITY_LEVELS.filter((a) => scopeCovers(ctx.profile.maxAcuity, a));

    const queue =
      ctx.profile.online && licenses.length > 0 && allowedAcuities.length > 0
        ? await db
            .select({
              id: visits.id,
              intakeSessionId: visits.intakeSessionId,
              acuity: visits.acuity,
              patientState: visits.patientState,
              chiefComplaint: visits.chiefComplaint,
              queuedAt: visits.queuedAt,
              flags: intakeSessions.aiFlags,
            })
            .from(visits)
            .innerJoin(intakeSessions, eq(visits.intakeSessionId, intakeSessions.id))
            .where(
              and(
                eq(visits.status, 'queued'),
                inArray(visits.patientState, licenses),
                inArray(visits.acuity, allowedAcuities),
              ),
            )
            .orderBy(
              sql`array_position(${sql.raw(`ARRAY[${ACUITY_LEVELS.map((a) => `'${a}'`).join(',')}]::varchar[]`)}, ${visits.acuity})`,
              asc(visits.queuedAt),
            )
            .limit(50)
        : [];

    const active = await db
      .select({
        id: visits.id,
        intakeSessionId: visits.intakeSessionId,
        acuity: visits.acuity,
        patientState: visits.patientState,
        chiefComplaint: visits.chiefComplaint,
        status: visits.status,
        patientUserId: visits.patientUserId,
        queuedAt: visits.queuedAt,
        acceptedAt: visits.acceptedAt,
        brief: intakeSessions.aiBrief,
        responses: intakeSessions.responses,
        patientName: user.name,
        patientEmail: user.email,
        patientPhone: patientProfiles.phone,
        patientDob: patientProfiles.dateOfBirth,
        conditions: patientProfiles.conditions,
        medications: patientProfiles.medications,
        allergies: patientProfiles.allergies,
      })
      .from(visits)
      .innerJoin(intakeSessions, eq(visits.intakeSessionId, intakeSessions.id))
      .innerJoin(user, eq(visits.patientUserId, user.id))
      .leftJoin(patientProfiles, eq(patientProfiles.userId, visits.patientUserId))
      .where(and(eq(visits.clinicianUserId, ctx.userId), eq(visits.status, 'accepted')))
      .orderBy(desc(visits.acceptedAt))
      .limit(10);

    for (const a of active) audit(req, { action: 'brief.view', actorUserId: ctx.userId, actorRole: ctx.isAdmin ? 'admin' : 'provider', resourceType: 'visit', resourceId: a.id, patientUserId: a.patientUserId, meta: { intakeSessionId: a.intakeSessionId } });
    const iso = (d: Date | null) => (d ? d.toISOString() : null);
    res.json({
      online: !!ctx.profile.online,
      queue: queue.map((q) => ({
        ...q,
        queuedAt: iso(q.queuedAt),
        flagCount: Array.isArray(q.flags) ? q.flags.length : 0,
        flags: undefined,
      })),
      active: active.map((a) => ({ ...a, queuedAt: iso(a.queuedAt), acceptedAt: iso(a.acceptedAt) })),
    });
  } catch (error) {
    logErr('dispatch.queue.error', error);
    res.status(500).json({ error: 'Failed to load queue' });
  }
}
