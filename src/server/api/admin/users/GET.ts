import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { user } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';
import { getAuth } from '../../../../lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const session = await getAuth().api.getSession({
      headers: new Headers(req.headers as Record<string, string>),
    });
    if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });

    // Must be an admin
    const [requester] = await db.select().from(user).where(eq(user.id, session.user.id)).limit(1);
    if (!requester?.isAdmin) return res.status(403).json({ error: 'Forbidden — admin only' });

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
