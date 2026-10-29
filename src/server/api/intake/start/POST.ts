import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { intakeSessions } from '../../../db/schema.js';
import { requireSession } from '../../../lib/session.js';

export default async function handler(req: Request, res: Response) {
  try {
    const session = await requireSession(req, res, 'patient');
    if (!session) return;

    const [created] = await db
      .insert(intakeSessions)
      .values({
        userId: session.userId,
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
