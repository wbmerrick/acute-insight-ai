import type { Request, Response } from 'express';
import { desc, eq } from 'drizzle-orm';
import { db } from '../../../db/client.js';
import { accessRequests, user } from '../../../db/schema.js';
import { getAuth } from '../../../../lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const session = await getAuth().api.getSession({
      headers: new Headers(req.headers as Record<string, string>),
    });
    if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });

    const [requester] = await db.select().from(user).where(eq(user.id, session.user.id)).limit(1);
    if (!requester?.isAdmin) return res.status(403).json({ error: 'Forbidden — admin only' });

    const rows = await db
      .select()
      .from(accessRequests)
      .orderBy(desc(accessRequests.createdAt))
      .limit(200);

    res.json(
      rows.map((r) => ({
        ...r,
        createdAt: r.createdAt ? r.createdAt.toISOString() : null,
      }))
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'admin.access_requests.error',
        error: error instanceof Error ? error.message : String(error),
      })
    );
    res.status(500).json({ error: 'Failed to fetch access requests' });
  }
}
