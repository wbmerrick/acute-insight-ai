import type { Request, Response } from 'express';
import { and, asc, eq, gte, lt } from 'drizzle-orm';
import { db } from '../../../db/client.js';
import { visits, clinicianProfiles } from '../../../db/schema.js';
import { requireAdmin, logErr } from '../../../lib/dispatch.js';
import { parseMonth, currentMonth, accountingSummary, accountingCsvRows, toCsv } from '../../../lib/statements.js';
import { audit } from '../../../lib/audit.js';

/**
 * Platform accounting for a calendar month (UTC): gross captured, clinician
 * payouts (owed / transferred / failed), platform margin before processing
 * fees, by acuity and by clinician. Completed visits only, by completed_at.
 * ?month=YYYY-MM (default: current month) · ?month=all for everything ·
 * ?format=csv for a download. Admin only; ids and amounts, never clinical text.
 */
export default async function handler(req: Request, res: Response) {
  try {
    const session = await requireAdmin(req, res);
    if (!session) return;

    const monthParam = typeof req.query.month === 'string' && req.query.month ? req.query.month : currentMonth();
    const all = monthParam === 'all';
    const range = all ? null : parseMonth(monthParam);
    if (!all && !range) return res.status(400).json({ error: 'month must be YYYY-MM or "all"' });

    const where = range
      ? and(eq(visits.status, 'completed'), gte(visits.completedAt, range.from), lt(visits.completedAt, range.to))
      : eq(visits.status, 'completed');
    const rows = await db
      .select({
        id: visits.id,
        acuity: visits.acuity,
        state: visits.patientState,
        completedAt: visits.completedAt,
        amountCents: visits.amountCents,
        paymentStatus: visits.paymentStatus,
        payoutCents: visits.payoutCents,
        payoutStatus: visits.payoutStatus,
        clinicianUserId: visits.clinicianUserId,
        clinicianName: clinicianProfiles.displayName,
      })
      .from(visits)
      .leftJoin(clinicianProfiles, eq(clinicianProfiles.userId, visits.clinicianUserId))
      .where(where)
      .orderBy(asc(visits.completedAt));

    const summary = accountingSummary(rows, all ? 'all' : range!.label);
    const format = req.query.format === 'csv' ? 'csv' : 'json';
    audit(req, { action: 'admin.accounting.view', actorUserId: session.userId, actorRole: 'admin', resourceType: 'accounting', resourceId: summary.month, meta: { format, visits: rows.length } });

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="acute-insight-accounting-${summary.month}.csv"`);
      return res.send(toCsv(accountingCsvRows(summary)));
    }
    res.json(summary);
  } catch (error) {
    logErr('admin.accounting.error', error);
    res.status(500).json({ error: 'Failed to compute accounting' });
  }
}
