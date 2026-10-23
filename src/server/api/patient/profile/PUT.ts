import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { patientProfiles } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';
import { getAuth } from '../../../../lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: new Headers(req.headers as Record<string, string>) });
    if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });

    const { dateOfBirth, gender, phone, conditions, medications, allergies } = req.body;

    const [existing] = await db
      .select({ id: patientProfiles.id })
      .from(patientProfiles)
      .where(eq(patientProfiles.userId, session.user.id))
      .limit(1);

    if (existing) {
      await db
        .update(patientProfiles)
        .set({ dateOfBirth, gender, phone, conditions, medications, allergies })
        .where(eq(patientProfiles.userId, session.user.id));
    } else {
      await db.insert(patientProfiles).values({
        userId: session.user.id,
        dateOfBirth,
        gender,
        phone,
        conditions,
        medications,
        allergies,
      });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error(JSON.stringify({ event: 'api.error', route: 'patient/profile/PUT.ts', error: error instanceof Error ? error.message : String(error) }));
    res.status(500).json({ error: 'Failed to update profile' });
  }
}
