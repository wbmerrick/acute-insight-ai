import type { Request, Response } from 'express';
import { and, asc, eq, gte, gt, lte } from 'drizzle-orm';
import { db } from '../../../../db/client.js';
import { auditEvents, user } from '../../../../db/schema.js';
import { getAuth } from '../../../../../lib/auth/auth.js';
import { audit } from '../../../../lib/audit.js';

/**
 * Admin: export the audit trail as CSV for off-platform retention (HIPAA asks for
 * six years; the hosting tier may keep far less). ?from=YYYY-MM-DD&to=YYYY-MM-DD,
 * default = everything. Streams in id order, oldest first, in pages — never loads
 * the whole table. The export itself is audited.
 */
const PAGE = 1000;
const COLS = ['id', 'created_at', 'action', 'actor_user_id', 'actor_role', 'resource_type', 'resource_id', 'patient_user_id', 'ip', 'user_agent', 'meta'] as const;

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function parseDay(s: string | undefined, endOfDay = false): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default async function handler(req: Request, res: Response) {
  try {
    const session = await getAuth().api.getSession({ headers: new Headers(req.headers as Record<string, string>) });
    if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });
    const [me] = await db.select({ isAdmin: user.isAdmin }).from(user).where(eq(user.id, session.user.id)).limit(1);
    if (!me?.isAdmin) return res.status(403).json({ error: 'Admin only' });

    const { from, to } = req.query as Record<string, string | undefined>;
    const fromD = parseDay(from);
    const toD = parseDay(to, true);
    if ((from && !fromD) || (to && !toD)) return res.status(400).json({ error: 'Dates must be YYYY-MM-DD' });

    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="acute-insight-audit-${from ?? 'start'}-to-${to ?? stamp}.csv"`);
    res.write(COLS.join(',') + '\n');

    let after = 0;
    let total = 0;
    for (;;) {
      const conds = [gt(auditEvents.id, after)];
      if (fromD) conds.push(gte(auditEvents.createdAt, fromD));
      if (toD) conds.push(lte(auditEvents.createdAt, toD));
      const rows = await db.select().from(auditEvents).where(and(...conds)).orderBy(asc(auditEvents.id)).limit(PAGE);
      if (!rows.length) break;
      for (const r of rows) {
        res.write(
          [r.id, r.createdAt?.toISOString() ?? '', r.action, r.actorUserId, r.actorRole, r.resourceType, r.resourceId, r.patientUserId, r.ip, r.userAgent, r.meta]
            .map(csvCell)
            .join(',') + '\n',
        );
      }
      total += rows.length;
      after = rows[rows.length - 1].id;
      if (rows.length < PAGE) break;
    }
    res.end();
    audit(req, { action: 'admin.audit.export', actorUserId: session.user.id, actorRole: 'admin', resourceType: 'audit_events', meta: { rows: total, from: from ?? null, to: to ?? null } });
  } catch (error) {
    console.error(JSON.stringify({ event: 'admin.audit.export.error', error: error instanceof Error ? error.message : String(error) }));
    if (!res.headersSent) res.status(500).json({ error: 'Export failed' });
    else res.end();
  }
}
