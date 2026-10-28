import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { patientProfiles, user } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';
import { getAuth } from '../../../../lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: new Headers(req.headers as Record<string, string>) });
    if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });

    const [profile] = await db
      .select()
      .from(patientProfiles)
      .where(eq(patientProfiles.userId, session.user.id))
      .limit(1);

    const [userData] = await db
      .select({ name: user.name, email: user.email, createdAt: user.createdAt })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    res.json({ profile: profile ?? null, user: userData ?? null, deleteMode: process.env.ACCOUNT_DELETE_MODE === 'deidentify' ? 'deidentify' : 'delete' });
  } catch (error) {
    console.error(JSON.stringify({ event: 'api.error', route: 'patient/profile/GET.ts', error: error instanceof Error ? error.message : String(error) }));
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
}
