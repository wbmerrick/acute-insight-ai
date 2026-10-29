import { describe, it, expect } from 'vitest';
import { parseMonth, currentMonth, toCsv, clinicianStatementRows, accountingSummary, accountingCsvRows, type AccountingVisit } from './statements';

describe('parseMonth / currentMonth', () => {
  it('parses a valid month into a UTC [from, to) range', () => {
    const r = parseMonth('2026-10')!;
    expect(r.from.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    expect(r.to.toISOString()).toBe('2026-11-01T00:00:00.000Z');
    expect(r.label).toBe('2026-10');
  });
  it('December rolls into January of the next year', () => {
    const r = parseMonth('2026-12')!;
    expect(r.to.toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });
  it('rejects garbage', () => {
    for (const bad of ['2026-13', '2026-0', 'banana', '26-10', '2026-10-01', '2300-01', '']) expect(parseMonth(bad)).toBeNull();
  });
  it('currentMonth is YYYY-MM in UTC', () => {
    expect(currentMonth(new Date('2026-10-29T05:00:00Z'))).toBe('2026-10');
    expect(currentMonth(new Date('2026-01-01T00:00:00Z'))).toBe('2026-01');
  });
});

describe('toCsv', () => {
  it('quotes cells with commas, quotes and newlines', () => {
    expect(toCsv([['a', 'b,c', 'say "hi"', 'line\nbreak']])).toBe('a,"b,c","say ""hi""","line\nbreak"\r\n');
  });
});

const v = (over: Partial<AccountingVisit>): AccountingVisit => ({
  id: 1, acuity: 'urgent', state: 'TN', completedAt: new Date('2026-10-05T12:00:00Z'),
  payoutCents: 5500, payoutStatus: 'owed', paymentStatus: 'captured', amountCents: 7900,
  clinicianUserId: 'u1', clinicianName: 'Dr. A', stripeTransferId: null, ...over,
});

describe('clinicianStatementRows', () => {
  it('one row per visit plus totals', () => {
    const rows = clinicianStatementRows([
      v({ id: 10, payoutStatus: 'transferred', stripeTransferId: 'tr_1' }),
      v({ id: 11, payoutStatus: 'owed' }),
    ]);
    expect(rows[0][0]).toBe('completed_at_utc');
    expect(rows[1][1]).toBe(10);
    expect(rows[1][6]).toBe('tr_1');
    const flat = rows.map((r) => r.join('|'));
    expect(flat).toContain('TOTAL owed (USD)|55.00');
    expect(flat).toContain('TOTAL transferred (USD)|55.00');
    expect(flat).toContain('TOTAL completed visits|2');
  });
  it('failed transfers get their own total only when present', () => {
    const none = clinicianStatementRows([v({})]).map((r) => r.join('|')).join('\n');
    expect(none).not.toContain('failed');
    const some = clinicianStatementRows([v({ payoutStatus: 'failed' })]).map((r) => r.join('|')).join('\n');
    expect(some).toContain('TOTAL failed transfers (USD)|55.00');
  });
});

describe('accountingSummary', () => {
  it('sums gross, payouts, and margin from completed visits', () => {
    const s = accountingSummary([
      v({ id: 1, payoutStatus: 'transferred' }),
      v({ id: 2, payoutStatus: 'owed' }),
      v({ id: 3, acuity: 'routine', amountCents: 3900, payoutCents: 2500, payoutStatus: 'owed' }),
      v({ id: 4, paymentStatus: 'none', amountCents: null, payoutCents: null, payoutStatus: 'none' }), // free visit — no money
    ], '2026-10');
    expect(s.visitsCompleted).toBe(4);
    expect(s.paidVisits).toBe(3);
    expect(s.grossCapturedCents).toBe(7900 + 7900 + 3900);
    expect(s.payoutTransferredCents).toBe(5500);
    expect(s.payoutOwedCents).toBe(5500 + 2500);
    expect(s.payoutTotalCents).toBe(13500);
    expect(s.platformMarginCents).toBe(19700 - 13500);
    expect(s.byAcuity.urgent.visits).toBe(3);
    expect(s.byAcuity.routine.grossCents).toBe(3900);
  });
  it('groups by clinician, biggest earner first, free visits counted', () => {
    const s = accountingSummary([
      v({ id: 1, clinicianUserId: 'u1', clinicianName: 'Dr. A', payoutStatus: 'transferred' }),
      v({ id: 2, clinicianUserId: 'u2', clinicianName: 'Dr. B', payoutCents: 2500, payoutStatus: 'owed', amountCents: 3900, acuity: 'routine' }),
      v({ id: 3, clinicianUserId: 'u1', clinicianName: 'Dr. A', payoutStatus: 'owed' }),
    ], 'all');
    expect(s.byClinician[0].clinicianUserId).toBe('u1');
    expect(s.byClinician[0].transferredCents + s.byClinician[0].owedCents).toBe(11000);
    expect(s.byClinician[1].owedCents).toBe(2500);
  });
  it('an empty month is all zeros, no estimates', () => {
    const s = accountingSummary([], '2026-09');
    expect(s.grossCapturedCents).toBe(0);
    expect(s.platformMarginCents).toBe(0);
    expect(s.byClinician).toEqual([]);
    expect(s.note).toMatch(/not tracked here/);
  });
});

describe('accountingCsvRows', () => {
  it('carries the summary, per-acuity and per-clinician sections', () => {
    const s = accountingSummary([v({ payoutStatus: 'transferred' })], '2026-10');
    const csv = toCsv(accountingCsvRows(s));
    expect(csv).toContain('gross_captured_usd,79.00');
    expect(csv).toContain('platform_margin_before_fees_usd,24.00');
    expect(csv).toContain('urgent,1,79.00,55.00');
    expect(csv).toContain('Dr. A,u1,1,79.00,0.00,55.00,0.00');
  });
});
