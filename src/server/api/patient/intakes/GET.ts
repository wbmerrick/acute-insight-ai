import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { intakeSessions } from '../../../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { getAuth } from '../../../../lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: new Headers(req.headers as Record<string, string>) });
    if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });

    const intakes = await db
      .select()
      .from(intakeSessions)
      .where(eq(intakeSessions.userId, session.user.id))
      .orderBy(desc(intakeSessions.createdAt));

    res.json(intakes);
  } catch (error) {
    console.error(JSON.stringify({ event: 'api.error', route: 'patient/intakes/GET.ts', error: error instanceof Error ? error.message : String(error) }));
    res.status(500).json({ error: 'Failed to fetch intakes' });
  }
}
