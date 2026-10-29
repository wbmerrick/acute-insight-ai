/**
 * Payout statements and the platform accounting view — pure helpers, tested.
 *
 * A clinician downloads a monthly CSV of their completed visits with the payout
 * per visit (what they'll reconcile against 1099s); the admin accounting view
 * sums a calendar month: gross captured, clinician payouts, platform margin,
 * and per-clinician totals. Everything is cents in, formatted out. Months are
 * calendar months in UTC (completed_at is stored UTC). Stripe processing fees
 * are not tracked here — the response says so rather than estimating.
 */

export interface StatementVisit {
  id: number;
  acuity: string;
  state: string;
  completedAt: Date | null;
  payoutCents: number | null;
  payoutStatus: string | null;
  paymentStatus: string | null;
  stripeTransferId?: string | null;
}

export interface AccountingVisit extends StatementVisit {
  amountCents: number | null;
  clinicianUserId: string | null;
  clinicianName: string | null;
}

/** "YYYY-MM" → UTC [from, to) range, or null when the string is not a valid month. */
export function parseMonth(month: string): { from: Date; to: Date; label: string } | null {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (y < 2020 || y > 2100) return null;
  return {
    from: new Date(Date.UTC(y, mo - 1, 1)),
    to: new Date(Date.UTC(y, mo, 1)),
    label: month,
  };
}

/** The current calendar month in UTC as "YYYY-MM". */
export function currentMonth(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export const usdFromCents = (c: number | null | undefined) => ((c ?? 0) / 100).toFixed(2);

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: (string | number | null)[][]): string {
  return rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

/** A clinician's statement: one row per completed visit, then TOTAL rows. */
export function clinicianStatementRows(visits: StatementVisit[]): (string | number | null)[][] {
  const rows: (string | number | null)[][] = [
    ['completed_at_utc', 'visit_id', 'acuity', 'patient_state', 'payout_usd', 'payout_status', 'stripe_transfer_id'],
  ];
  for (const v of visits) {
    rows.push([
      v.completedAt ? v.completedAt.toISOString() : '',
      v.id,
      v.acuity,
      v.state,
      usdFromCents(v.payoutCents),
      v.payoutStatus ?? 'none',
      v.stripeTransferId ?? '',
    ]);
  }
  const sum = (st: string) => visits.filter((v) => v.payoutStatus === st).reduce((s, v) => s + (v.payoutCents ?? 0), 0);
  rows.push([]);
  rows.push(['TOTAL owed (USD)', usdFromCents(sum('owed'))]);
  rows.push(['TOTAL transferred (USD)', usdFromCents(sum('transferred'))]);
  if (sum('failed') > 0) rows.push(['TOTAL failed transfers (USD)', usdFromCents(sum('failed'))]);
  rows.push(['TOTAL completed visits', visits.length]);
  return rows;
}

export interface AccountingSummary {
  month: string | 'all';
  visitsCompleted: number;
  paidVisits: number;
  grossCapturedCents: number;
  payoutOwedCents: number;
  payoutTransferredCents: number;
  payoutFailedCents: number;
  payoutTotalCents: number;
  /** Gross captured minus clinician payouts — BEFORE Stripe processing fees, which are not tracked here. */
  platformMarginCents: number;
  byAcuity: Record<string, { visits: number; grossCents: number; payoutCents: number }>;
  byClinician: { clinicianUserId: string | null; clinicianName: string | null; visits: number; grossCents: number; owedCents: number; transferredCents: number; failedCents: number }[];
  note: string;
}

/** Sum a month of completed visits into the platform accounting view. */
export function accountingSummary(visits: AccountingVisit[], month: string | 'all'): AccountingSummary {
  const paid = visits.filter((v) => v.paymentStatus === 'captured');
  const gross = paid.reduce((s, v) => s + (v.amountCents ?? 0), 0);
  const payoutSum = (st: string) => visits.filter((v) => v.payoutStatus === st).reduce((s, v) => s + (v.payoutCents ?? 0), 0);
  const owed = payoutSum('owed');
  const transferred = payoutSum('transferred');
  const failed = payoutSum('failed');
  const payoutTotal = owed + transferred + failed;

  const byAcuity: AccountingSummary['byAcuity'] = {};
  for (const v of visits) {
    const a = (byAcuity[v.acuity] ??= { visits: 0, grossCents: 0, payoutCents: 0 });
    a.visits++;
    if (v.paymentStatus === 'captured') a.grossCents += v.amountCents ?? 0;
    if (v.payoutStatus === 'owed' || v.payoutStatus === 'transferred' || v.payoutStatus === 'failed') a.payoutCents += v.payoutCents ?? 0;
  }

  const byClin = new Map<string, AccountingSummary['byClinician'][number]>();
  for (const v of visits) {
    const key = v.clinicianUserId ?? '(none)';
    const c = byClin.get(key) ?? { clinicianUserId: v.clinicianUserId, clinicianName: v.clinicianName, visits: 0, grossCents: 0, owedCents: 0, transferredCents: 0, failedCents: 0 };
    c.visits++;
    if (!c.clinicianName && v.clinicianName) c.clinicianName = v.clinicianName;
    if (v.paymentStatus === 'captured') c.grossCents += v.amountCents ?? 0;
    if (v.payoutStatus === 'owed') c.owedCents += v.payoutCents ?? 0;
    if (v.payoutStatus === 'transferred') c.transferredCents += v.payoutCents ?? 0;
    if (v.payoutStatus === 'failed') c.failedCents += v.payoutCents ?? 0;
    byClin.set(key, c);
  }

  return {
    month,
    visitsCompleted: visits.length,
    paidVisits: paid.length,
    grossCapturedCents: gross,
    payoutOwedCents: owed,
    payoutTransferredCents: transferred,
    payoutFailedCents: failed,
    payoutTotalCents: payoutTotal,
    platformMarginCents: gross - payoutTotal,
    byAcuity,
    byClinician: [...byClin.values()].sort((a, b) => b.transferredCents + b.owedCents - (a.transferredCents + a.owedCents)),
    note: 'Completed visits only, by completed_at (UTC). Margin is before Stripe processing fees, which are not tracked here — see the Stripe dashboard. Cancelled-visit releases/refunds are not revenue and are not shown.',
  };
}

export function accountingCsvRows(s: AccountingSummary): (string | number | null)[][] {
  const rows: (string | number | null)[][] = [
    ['Acute Insight accounting', s.month === 'all' ? 'all time' : `${s.month} (UTC)`],
    [],
    ['completed_visits', s.visitsCompleted],
    ['paid_visits_captured', s.paidVisits],
    ['gross_captured_usd', usdFromCents(s.grossCapturedCents)],
    ['clinician_payouts_owed_usd', usdFromCents(s.payoutOwedCents)],
    ['clinician_payouts_transferred_usd', usdFromCents(s.payoutTransferredCents)],
    ['clinician_payouts_failed_usd', usdFromCents(s.payoutFailedCents)],
    ['platform_margin_before_fees_usd', usdFromCents(s.platformMarginCents)],
    [],
    ['acuity', 'visits', 'gross_usd', 'payout_usd'],
  ];
  for (const [acuity, a] of Object.entries(s.byAcuity)) rows.push([acuity, a.visits, usdFromCents(a.grossCents), usdFromCents(a.payoutCents)]);
  rows.push([]);
  rows.push(['clinician', 'clinician_user_id', 'visits', 'gross_usd', 'owed_usd', 'transferred_usd', 'failed_usd']);
  for (const c of s.byClinician) rows.push([c.clinicianName ?? '', c.clinicianUserId ?? '', c.visits, usdFromCents(c.grossCents), usdFromCents(c.owedCents), usdFromCents(c.transferredCents), usdFromCents(c.failedCents)]);
  rows.push([]);
  rows.push(['note', s.note]);
  return rows;
}
