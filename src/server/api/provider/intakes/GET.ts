import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { intakeSessions, user, patientProfiles } from '../../../db/schema.js';
import { eq, desc, inArray } from 'drizzle-orm';
import { getAuth } from '../../../../lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    // Verify session
    const session = await getAuth().api.getSession({ headers: req.headers as unknown as Headers });
    if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });

    // Must be a provider or admin
    const dbUser = await db.select().from(user).where(eq(user.id, session.user.id)).limit(1);
    if (!dbUser[0] || (dbUser[0].role !== 'provider' && !dbUser[0].isAdmin)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Fetch all completed intakes with patient info
    const intakes = await db
      .select({
        id: intakeSessions.id,
        status: intakeSessions.status,
        chiefComplaint: intakeSessions.chiefComplaint,
        aiSummary: intakeSessions.aiSummary,
        aiFlags: intakeSessions.aiFlags,
        appointmentDate: intakeSessions.appointmentDate,
        providerName: intakeSessions.providerName,
        createdAt: intakeSessions.createdAt,
        patientId: intakeSessions.userId,
        patientName: user.name,
        patientEmail: user.email,
      })
      .from(intakeSessions)
      .innerJoin(user, eq(intakeSessions.userId, user.id))
      .where(eq(intakeSessions.status, 'complete'))
      .orderBy(desc(intakeSessions.createdAt));

    // Fetch profiles for all patients
    const patientIds = [...new Set(intakes.map((i) => i.patientId))];
    const profiles =
      patientIds.length > 0
        ? await db
            .select()
            .from(patientProfiles)
            .where(inArray(patientProfiles.userId, patientIds))
        : [];

    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    const result = intakes.map((intake) => ({
      ...intake,
      appointmentDate: intake.appointmentDate ? intake.appointmentDate.toISOString() : null,
      createdAt: intake.createdAt ? intake.createdAt.toISOString() : new Date().toISOString(),
      profile: profileMap.get(intake.patientId) ?? null,
    }));

    res.json(result);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'provider.intakes.error',
        error: error instanceof Error ? error.message : String(error),
      })
    );
    res.status(500).json({ error: 'Failed to fetch intakes' });
  }
}
