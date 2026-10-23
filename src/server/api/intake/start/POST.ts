import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { intakeSessions } from '../../../db/schema.js';
import { getAuth } from '../../../../lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const session = await getAuth().api.getSession({
      headers: new Headers(req.headers as Record<string, string>),
    });
    if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });

    const [created] = await db
      .insert(intakeSessions)
      .values({
        userId: session.user.id,
        status: 'in_progress',
        responses: [],
      })
      .returning({ id: intakeSessions.id });

    res.status(201).json({ id: created.id });
  } catch (error) {
    console.error(JSON.stringify({ event: 'api.error', route: 'intake/start/POST.ts', error: error instanceof Error ? error.message : String(error) }));
    res.status(500).json({ error: 'Failed to start intake' });
  }
}
