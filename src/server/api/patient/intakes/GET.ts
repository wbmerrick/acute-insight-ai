import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { intakeSessions, visits, clinicianProfiles } from '../../../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { getAuth } from '../../../../lib/auth/auth.js';

/** The patient's intakes, each with its dispatch visit (if they requested a clinician). */
export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: new Headers(req.headers as Record<string, string>) });
    if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });

    const rows = await db
      .select({
        intake: intakeSessions,
        visitId: visits.id,
        visitStatus: visits.status,
        visitState: visits.patientState,
        visitAcceptedAt: visits.acceptedAt,
        visitCompletedAt: visits.completedAt,
        clinicianName: clinicianProfiles.displayName,
        clinicianCredential: clinicianProfiles.credential,
      })
      .from(intakeSessions)
      .leftJoin(visits, eq(visits.intakeSessionId, intakeSessions.id))
      .leftJoin(clinicianProfiles, eq(clinicianProfiles.userId, visits.clinicianUserId))
      .where(eq(intakeSessions.userId, session.user.id))
      .orderBy(desc(intakeSessions.createdAt));

    res.json(
      rows.map((r) => ({
        ...r.intake,
        visit: r.visitId
          ? {
              id: r.visitId,
              status: r.visitStatus,
              state: r.visitState,
              acceptedAt: r.visitAcceptedAt ? r.visitAcceptedAt.toISOString() : null,
              completedAt: r.visitCompletedAt ? r.visitCompletedAt.toISOString() : null,
              clinicianName: r.clinicianName,
              clinicianCredential: r.clinicianCredential,
            }
          : null,
      })),
    );
  } catch (error) {
    console.error(JSON.stringify({ event: 'api.error', route: 'patient/intakes/GET.ts', error: error instanceof Error ? error.message : String(error) }));
    res.status(500).json({ error: 'Failed to fetch intakes' });
  }
}
