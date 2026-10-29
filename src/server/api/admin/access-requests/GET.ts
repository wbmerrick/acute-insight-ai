import type { Request, Response } from 'express';
import { desc } from 'drizzle-orm';
import { db } from '../../../db/client.js';
import { accessRequests } from '../../../db/schema.js';
import { requireAdmin } from '../../../lib/dispatch.js';

export default async function handler(req: Request, res: Response) {
  try {
    const session = await requireAdmin(req, res);
    if (!session) return;

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
