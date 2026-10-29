import type { Request, Response } from 'express';
import { and, eq } from 'drizzle-orm';
import { db } from '../../../db/client.js';
import { patientAssignments, user } from '../../../db/schema.js';
import { requireAdmin } from '../../../lib/dispatch.js';
import { audit } from '../../../lib/audit.js';
import { requireRecentAuth } from '../../../lib/reauth.js';

/** Body: { providerId, patientId, remove?: boolean } */
export default async function handler(req: Request, res: Response) {
  try {
    const session = await requireAdmin(req, res);
    if (!session) return;

    // Sensitive: requires a fresh password confirmation (step-up re-auth).
    if (!(await requireRecentAuth(req, res))) return;

    const { providerId, patientId, remove } = (req.body ?? {}) as { providerId?: string; patientId?: string; remove?: boolean };
    if (!providerId || !patientId) return res.status(400).json({ error: 'providerId and patientId required' });
    const [prov] = await db.select({ role: user.role, isAdmin: user.isAdmin }).from(user).where(eq(user.id, providerId)).limit(1);
    if (!prov || (prov.role !== 'provider' && !prov.isAdmin)) return res.status(400).json({ error: 'Target is not a provider' });
    const [pt] = await db.select({ id: user.id }).from(user).where(eq(user.id, patientId)).limit(1);
    if (!pt) return res.status(404).json({ error: 'Patient not found' });

    if (remove) {
      await db.delete(patientAssignments).where(and(eq(patientAssignments.providerUserId, providerId), eq(patientAssignments.patientUserId, patientId)));
    } else {
      await db.insert(patientAssignments).values({ providerUserId: providerId, patientUserId: patientId, assignedBy: session.userId }).onConflictDoNothing();
    }
    audit(req, { action: remove ? 'admin.assignment.remove' : 'admin.assignment.add', actorUserId: session.userId, actorRole: 'admin', resourceType: 'user', resourceId: providerId, patientUserId: patientId });
    res.json({ ok: true });
  } catch (error) {
    console.error(JSON.stringify({ event: 'admin.assignments.post.error', error: error instanceof Error ? error.message : String(error) }));
    res.status(500).json({ error: 'Failed to update assignment' });
  }
}
