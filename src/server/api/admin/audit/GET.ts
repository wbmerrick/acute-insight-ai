import type { Request, Response } from 'express';
import { and, desc, eq, lt } from 'drizzle-orm';
import { db } from '../../../db/client.js';
import { auditEvents } from '../../../db/schema.js';
import { requireAdmin } from '../../../lib/dispatch.js';

/** Admin: the audit trail, newest first. Filters: patient, actor, action; cursor = before id. */
export default async function handler(req: Request, res: Response) {
  try {
    const session = await requireAdmin(req, res);
    if (!session) return;

    const { patient, actor, action, before } = req.query as Record<string, string | undefined>;
    const conds = [];
    if (patient) conds.push(eq(auditEvents.patientUserId, patient));
    if (actor) conds.push(eq(auditEvents.actorUserId, actor));
    if (action) conds.push(eq(auditEvents.action, action));
    if (before && Number.isInteger(Number(before))) conds.push(lt(auditEvents.id, Number(before)));

    const rows = await db
      .select()
      .from(auditEvents)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(auditEvents.id))
      .limit(100);
    res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt ? r.createdAt.toISOString() : null })));
  } catch (error) {
    console.error(JSON.stringify({ event: 'admin.audit.error', error: error instanceof Error ? error.message : String(error) }));
    res.status(500).json({ error: 'Failed to load audit log' });
  }
}
