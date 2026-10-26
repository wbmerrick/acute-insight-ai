import type { Request, Response } from 'express';
import { and, eq, desc } from 'drizzle-orm';
import { db } from '../../../db/client.js';
import { visits } from '../../../db/schema.js';
import { requireClinician, logErr } from '../../../lib/dispatch.js';
import { payoutsConfigured, connectEnabled } from '../../../lib/stripe.js';

/** This clinician's ledger. `configured:false` → no rates set, the UI shows nothing about money. */
export default async function handler(req: Request, res: Response) {
  try {
    const ctx = await requireClinician(req, res);
    if (!ctx) return;
    const configured = payoutsConfigured();
    const rows = configured
      ? await db
          .select({ id: visits.id, acuity: visits.acuity, state: visits.patientState, completedAt: visits.completedAt, payoutCents: visits.payoutCents, payoutStatus: visits.payoutStatus, paymentStatus: visits.paymentStatus })
          .from(visits)
          .where(and(eq(visits.clinicianUserId, ctx.userId), eq(visits.status, 'completed')))
          .orderBy(desc(visits.completedAt))
          .limit(200)
      : [];
    const sum = (st: string) => rows.filter((r) => r.payoutStatus === st).reduce((s, r) => s + (r.payoutCents ?? 0), 0);
    res.json({
      configured,
      connectEnabled: connectEnabled(),
      stripeAccountId: ctx.profile.stripeAccountId,
      payoutsEnabled: !!ctx.profile.payoutsEnabled,
      totals: { owedCents: sum('owed'), transferredCents: sum('transferred'), visits: rows.length },
      visits: rows.map((r) => ({ ...r, completedAt: r.completedAt ? r.completedAt.toISOString() : null })),
    });
  } catch (error) {
    logErr('dispatch.earnings.error', error);
    res.status(500).json({ error: 'Failed to load earnings' });
  }
}
