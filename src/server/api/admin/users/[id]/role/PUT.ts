import type { Request, Response } from 'express';
import { db } from '../../../../../db/client.js';
import { user, clinicianProfiles } from '../../../../../db/schema.js';
import { eq } from 'drizzle-orm';
import { getAuth } from '../../../../../../lib/auth/auth.js';
import { audit } from '../../../../../lib/audit.js';

export default async function handler(req: Request, res: Response) {
  try {
    const session = await getAuth().api.getSession({
      headers: new Headers(req.headers as Record<string, string>),
    });
    if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });

    // Must be an admin
    const [requester] = await db.select().from(user).where(eq(user.id, session.user.id)).limit(1);
    if (!requester?.isAdmin) return res.status(403).json({ error: 'Forbidden — admin only' });

    const targetId = req.params.id;
    const { role } = req.body as { role: string };

    if (!targetId) return res.status(400).json({ error: 'User ID required' });
    if (role !== 'patient' && role !== 'provider') {
      return res.status(400).json({ error: 'Role must be "patient" or "provider"' });
    }

    // Prevent demoting yourself
    if (targetId === session.user.id) {
      return res.status(400).json({ error: 'You cannot change your own role' });
    }

    const [target] = await db.select().from(user).where(eq(user.id, targetId as string)).limit(1);
    if (!target) return res.status(404).json({ error: 'User not found' });

    await db.update(user).set({ role: role as string }).where(eq(user.id, targetId as string));
    // A demoted clinician must stop receiving new-visit texts immediately.
    if (role === 'patient') await db.update(clinicianProfiles).set({ online: false, lastSeenAt: new Date() }).where(eq(clinicianProfiles.userId, targetId as string));

    audit(req, { action: 'admin.role.change', actorUserId: session.user.id, actorRole: 'admin', resourceType: 'user', resourceId: String(targetId), meta: { from: target.role ?? null, to: role } });
    res.json({ ok: true, id: targetId, role });
  } catch (error) {
    console.error(JSON.stringify({ event: 'api.error', route: 'admin/users/[id]/role/PUT.ts', error: error instanceof Error ? error.message : String(error) }));
    res.status(500).json({ error: 'Failed to update role' });
  }
}
