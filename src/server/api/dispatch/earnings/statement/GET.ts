import type { Request, Response } from 'express';
import { and, asc, eq, gte, lt } from 'drizzle-orm';
import { db } from '../../../../db/client.js';
import { visits } from '../../../../db/schema.js';
import { requireClinician, logErr } from '../../../../lib/dispatch.js';
import { payoutsConfigured } from '../../../../lib/stripe.js';
import { parseMonth, clinicianStatementRows, toCsv } from '../../../../lib/statements.js';
import { audit } from '../../../../lib/audit.js';

/**
 * This clinician's earnings statement as CSV — one row per completed visit with
 * the payout and its status, then totals. ?month=YYYY-MM for a calendar month
 * (UTC); omit for all time. Their own ledger only; what they reconcile against
 * a 1099. 409 until payout rates are configured (no money UI before then).
 */
export default async function handler(req: Request, res: Response) {
  try {
    const ctx = await requireClinician(req, res);
    if (!ctx) return;
    if (!payoutsConfigured()) return res.status(409).json({ error: 'Payouts are not configured yet' });

    const monthParam = typeof req.query.month === 'string' ? req.query.month : '';
    const range = monthParam ? parseMonth(monthParam) : null;
    if (monthParam && !range) return res.status(400).json({ error: 'month must be YYYY-MM' });

    const where = range
      ? and(eq(visits.clinicianUserId, ctx.userId), eq(visits.status, 'completed'), gte(visits.completedAt, range.from), lt(visits.completedAt, range.to))
      : and(eq(visits.clinicianUserId, ctx.userId), eq(visits.status, 'completed'));
    const rows = await db
      .select({ id: visits.id, acuity: visits.acuity, state: visits.patientState, completedAt: visits.completedAt, payoutCents: visits.payoutCents, payoutStatus: visits.payoutStatus, paymentStatus: visits.paymentStatus, stripeTransferId: visits.stripeTransferId })
      .from(visits)
      .where(where)
      .orderBy(asc(visits.completedAt));

    audit(req, { action: 'earnings.statement', actorUserId: ctx.userId, actorRole: ctx.isAdmin ? 'admin' : 'provider', resourceType: 'clinician', resourceId: ctx.userId, meta: { month: range?.label ?? 'all', rows: rows.length } });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="acute-insight-earnings-${range?.label ?? 'all-time'}.csv"`);
    res.send(toCsv(clinicianStatementRows(rows)));
  } catch (error) {
    logErr('dispatch.earnings.statement.error', error);
    res.status(500).json({ error: 'Failed to build your statement' });
  }
}
