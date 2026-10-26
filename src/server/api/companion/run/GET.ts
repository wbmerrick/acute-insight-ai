import type { Request, Response } from 'express';
import { and, eq, lte, lt, inArray } from 'drizzle-orm';
import { db } from '../../../db/client.js';
import { checkins, patientProfiles, intakeSessions } from '../../../db/schema.js';
import { logErr } from '../../../lib/dispatch.js';
import { sendSms, toE164, smsAvailable } from '../../../lib/sms.js';

const EXPIRE_AFTER_DAYS = Number(process.env.CHECKIN_EXPIRE_DAYS ?? 7);

/**
 * Hourly (Vercel cron, bearer CRON_SECRET): send due check-ins and expire stale ones.
 * The text is PHI-free — it names a date, not a complaint.
 */
export default async function handler(req: Request, res: Response) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const now = new Date();
    const due = await db
      .update(checkins)
      .set({ status: 'sent', sentAt: now })
      .where(and(eq(checkins.status, 'scheduled'), lte(checkins.dueAt, now)))
      .returning({ id: checkins.id, patientUserId: checkins.patientUserId, intakeSessionId: checkins.intakeSessionId });

    let texted = 0;
    if (smsAvailable() && due.length > 0) {
      const base = process.env.PUBLIC_BASE_URL ?? `${req.protocol}://${req.hostname}`;
      for (const c of due) {
        try {
          const [p] = await db.select({ phone: patientProfiles.phone }).from(patientProfiles).where(eq(patientProfiles.userId, c.patientUserId)).limit(1);
          const [i] = await db.select({ createdAt: intakeSessions.createdAt }).from(intakeSessions).where(eq(intakeSessions.id, c.intakeSessionId)).limit(1);
          const to = toE164(p?.phone);
          if (!to) continue;
          const when = i?.createdAt ? i.createdAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'your recent visit';
          const ok = await sendSms(to, `Acute Insight: how are you doing since ${when}? Tap to tell Ace — better, same, or worse: ${base}/portal?checkin=${c.id}. If this is an emergency, call 911.`);
          if (ok) texted++;
        } catch (err) {
          logErr('companion.run.text_failed', err);
        }
      }
    }

    const expireBefore = new Date(now.getTime() - EXPIRE_AFTER_DAYS * 86400 * 1000);
    const expired = await db
      .update(checkins)
      .set({ status: 'expired' })
      .where(and(inArray(checkins.status, ['scheduled', 'sent']), lt(checkins.dueAt, expireBefore)))
      .returning({ id: checkins.id });

    console.log(JSON.stringify({ event: 'companion.run', sent: due.length, texted, expired: expired.length }));
    res.json({ ok: true, sent: due.length, texted, expired: expired.length });
  } catch (error) {
    logErr('companion.run.error', error);
    res.status(500).json({ error: 'Companion run failed' });
  }
}
