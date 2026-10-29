import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { user } from '../../../db/schema.js';
import { requireAdmin } from '../../../lib/dispatch.js';

export default async function handler(req: Request, res: Response) {
  try {
    const session = await requireAdmin(req, res);
    if (!session) return;

    // Fetch all users
    const users = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(user.createdAt);

    res.json(
      users.map((u) => ({
        ...u,
        createdAt: u.createdAt ? u.createdAt.toISOString() : null,
      }))
    );
  } catch (error) {
    console.error(JSON.stringify({ event: 'api.error', route: 'admin/users/GET.ts', error: error instanceof Error ? error.message : String(error) }));
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}
