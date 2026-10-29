import type { Request, Response } from 'express';
import { and, gte, eq, or, isNull } from 'drizzle-orm';
import { db } from '../../../db/client.js';
import { visits, clinicianOnlineLog, checkins, clinicianProfiles, intakeSessions, betaChatStats } from '../../../db/schema.js';
import { requireClinician, logErr } from '../../../lib/dispatch.js';
import { median, percentile, onlineHours, rate } from '../../../lib/metrics.js';

/**
 * The two numbers the marketplace lives on — median wait-to-clinician and
 * visits per online clinician-hour — plus the funnel around them. Real rows
 * only; nulls where there is no data yet. Admin or provider.
 */
export default async function handler(req: Request, res: Response) {
  try {
    const ctx = await requireClinician(req, res);
    if (!ctx) return;
    const days = Math.min(90, Math.max(1, Number(req.query.days ?? 7) || 7));
    const to = new Date();
    const from = new Date(to.getTime() - days * 86400 * 1000);

    const vs = await db
      .select({ status: visits.status, acuity: visits.acuity, queuedAt: visits.queuedAt, acceptedAt: visits.acceptedAt, completedAt: visits.completedAt, paymentStatus: visits.paymentStatus, amountCents: visits.amountCents, state: visits.patientState })
      .from(visits)
      .where(gte(visits.createdAt, from));

    const requested = vs.length;
    const paidOrFree = vs.filter((v) => v.status !== 'pending_payment');
    const accepted = vs.filter((v) => v.acceptedAt);
    const completed = vs.filter((v) => v.status === 'completed');
    const cancelled = vs.filter((v) => v.status === 'cancelled');
    const queuedNow = vs.filter((v) => v.status === 'queued').length;
    const waitsMin = accepted.filter((v) => v.queuedAt).map((v) => (v.acceptedAt!.getTime() - v.queuedAt!.getTime()) / 60000);
    const visitMin = completed.filter((v) => v.acceptedAt).map((v) => (v.completedAt!.getTime() - v.acceptedAt!.getTime()) / 60000);
    const capturedCents = vs.filter((v) => v.paymentStatus === 'captured').reduce((s, v) => s + (v.amountCents ?? 0), 0);

    const sessions = await db
      .select({ start: clinicianOnlineLog.wentOnlineAt, end: clinicianOnlineLog.wentOfflineAt })
      .from(clinicianOnlineLog)
      .where(or(isNull(clinicianOnlineLog.wentOfflineAt), gte(clinicianOnlineLog.wentOfflineAt, from)));
    const hours = onlineHours(sessions, from, to);

    const onlineCount = (await db.select({ id: clinicianProfiles.id }).from(clinicianProfiles).where(eq(clinicianProfiles.online, true))).length;

    // AI brief source on completed intakes in the window: how often the scripted
    // fallback served instead of the model. Pilot metric "AI fallback rate" —
    // rate over marked briefs only; briefs stored before the marker count as unmarked.
    const briefRows = await db
      .select({ brief: intakeSessions.aiBrief })
      .from(intakeSessions)
      .where(and(eq(intakeSessions.status, 'complete'), gte(intakeSessions.createdAt, from)));
    let briefModel = 0, briefFallback = 0, briefUnmarked = 0;
    for (const r of briefRows) {
      const src = (r.brief as { source?: unknown } | null)?.source;
      if (src === 'model') briefModel++;
      else if (src === 'fallback') briefFallback++;
      else briefUnmarked++;
    }

    // Open-beta pulse: aggregate guest-chat counters (no identifiers) in the window.
    const betaRows = await db
      .select({ day: betaChatStats.day, messages: betaChatStats.messages, conversations: betaChatStats.conversations })
      .from(betaChatStats)
      .where(gte(betaChatStats.day, from.toISOString().slice(0, 10)));
    const today = to.toISOString().slice(0, 10);
    const betaSum = (f: 'messages' | 'conversations', onlyToday = false) =>
      betaRows.filter((r) => !onlyToday || r.day === today).reduce((s, r) => s + r[f], 0);

    const cs = await db.select({ status: checkins.status, outcome: checkins.outcome, sentAt: checkins.sentAt }).from(checkins).where(gte(checkins.createdAt, from));
    const sent = cs.filter((c) => c.sentAt).length;
    const answered = cs.filter((c) => c.status === 'answered' || c.status === 'escalated').length;
    const escalated = cs.filter((c) => c.status === 'escalated').length;

    const byAcuity: Record<string, number> = {};
    for (const v of paidOrFree) byAcuity[v.acuity] = (byAcuity[v.acuity] ?? 0) + 1;
    const byState: Record<string, number> = {};
    for (const v of paidOrFree) byState[v.state] = (byState[v.state] ?? 0) + 1;

    res.json({
      windowDays: days,
      from: from.toISOString(),
      to: to.toISOString(),
      visits: {
        requested,
        queuedNow,
        accepted: accepted.length,
        completed: completed.length,
        cancelled: cancelled.length,
        acceptanceRate: rate(accepted.length, paidOrFree.length),
        byAcuity,
        byState,
      },
      wait: {
        medianMin: median(waitsMin),
        p90Min: percentile(waitsMin, 0.9),
        n: waitsMin.length,
      },
      visitLength: { medianMin: median(visitMin), n: visitMin.length },
      supply: {
        onlineNow: onlineCount,
        onlineHours: Math.round(hours * 10) / 10,
        visitsPerOnlineHour: hours > 0 ? Math.round((completed.length / hours) * 100) / 100 : null,
      },
      revenue: { capturedCents },
      beta: {
        guestMessages: betaSum('messages'),
        guestConversations: betaSum('conversations'),
        todayMessages: betaSum('messages', true),
        todayConversations: betaSum('conversations', true),
      },
      briefs: {
        completedIntakes: briefRows.length,
        model: briefModel,
        fallback: briefFallback,
        unmarked: briefUnmarked,
        fallbackRate: rate(briefFallback, briefModel + briefFallback),
      },
      companion: { sent, answered, escalated, responseRate: rate(answered, sent) },
    });
  } catch (error) {
    logErr('dispatch.metrics.error', error);
    res.status(500).json({ error: 'Failed to compute metrics' });
  }
}
