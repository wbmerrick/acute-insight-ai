/**
 * Companion — Ace follows up after care, and escalates when things get worse.
 *
 * Scheduling rules (pure, tested):
 *   post_visit          → 48h after the clinician marks the visit complete
 *   urgent_intake       → 24h after an URGENT intake that never became a visit
 *   telehealth_intake   → 48h after a TELEHEALTH intake that never became a visit
 *   routine/selfcare/emergency → no automatic check-in (emergency went to 911; routine is low-yield)
 *
 * Escalation rule: a follow-up intake escalates when its disposition is at least
 * URGENT, or is higher acuity than the original intake. Escalation never
 * suppresses the emergency path — an emergency follow-up still shows 911 first.
 */
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import { checkins, intakeSessions } from '../db/schema.js';
import { ACUITY_LEVELS, ACUITY_LABEL, type Acuity, type ClinicalBrief } from '../../lib/clinical-brief.js';

export type CheckinReason = 'post_visit' | 'urgent_intake' | 'telehealth_intake';

const HOURS = 3600 * 1000;

export function checkinDelayMs(reason: CheckinReason): number {
  switch (reason) {
    case 'post_visit': return 48 * HOURS;
    case 'urgent_intake': return 24 * HOURS;
    case 'telehealth_intake': return 48 * HOURS;
  }
}

/** Which check-in (if any) an intake with this disposition earns when it does NOT become a visit. */
export function intakeCheckinReason(level: Acuity | undefined | null): CheckinReason | null {
  if (level === 'urgent') return 'urgent_intake';
  if (level === 'telehealth') return 'telehealth_intake';
  return null;
}

export function acuityRank(level: string | undefined | null): number {
  const i = ACUITY_LEVELS.indexOf(level as Acuity);
  return i < 0 ? ACUITY_LEVELS.length : i; // unknown = lowest
}

/** True when the follow-up should escalate. Lower rank = higher acuity. */
export function shouldEscalate(originalLevel: string | null | undefined, followupLevel: string | null | undefined): boolean {
  const f = acuityRank(followupLevel);
  if (f <= acuityRank('urgent')) return true;
  if (!originalLevel) return false; // nothing to compare against — only urgent-or-above escalates
  return f < acuityRank(originalLevel);
}

export function escalationNote(originalLevel: string | null | undefined, followupLevel: string | null | undefined, outcome: string | null | undefined): string {
  const o = originalLevel ? ACUITY_LABEL[originalLevel as Acuity] ?? originalLevel : 'unknown';
  const f = followupLevel ? ACUITY_LABEL[followupLevel as Acuity] ?? followupLevel : 'unknown';
  const said = outcome === 'worse' ? 'Patient reports worse. ' : '';
  return `${said}Follow-up triaged ${f} (was ${o}).`;
}

/**
 * Schedule a check-in for an intake, replacing any still-pending one for the
 * same intake so a visit completing after an urgent intake yields one check-in,
 * not two.
 */
export async function scheduleCheckin(intakeSessionId: number, patientUserId: string, reason: CheckinReason, from = new Date()) {
  const dueAt = new Date(from.getTime() + checkinDelayMs(reason));
  await db
    .update(checkins)
    .set({ status: 'expired' })
    .where(and(eq(checkins.intakeSessionId, intakeSessionId), inArray(checkins.status, ['scheduled', 'sent'])));
  const [row] = await db.insert(checkins).values({ intakeSessionId, patientUserId, reason, dueAt }).returning({ id: checkins.id, dueAt: checkins.dueAt });
  return row;
}

/**
 * Link a completed follow-up intake to its check-in, decide escalation, and
 * record the result. Returns what happened so the complete endpoint can tell
 * the patient.
 */
export async function resolveCheckin(opts: {
  checkinId: number;
  patientUserId: string;
  followupIntakeId: number;
  followupBrief: ClinicalBrief;
  outcome?: 'better' | 'same' | 'worse' | null;
}): Promise<{ escalated: boolean; note: string | null; intakeSessionId: number } | null> {
  const [c] = await db
    .select({ id: checkins.id, intakeSessionId: checkins.intakeSessionId, status: checkins.status, outcome: checkins.outcome, followupIntakeId: checkins.followupIntakeId })
    .from(checkins)
    .where(and(eq(checkins.id, opts.checkinId), eq(checkins.patientUserId, opts.patientUserId)))
    .limit(1);
  if (!c) return null;
  // Only an open check-in can be answered. "Worse" marks it escalated at the tap, before
  // the follow-up intake exists, so an escalated-but-unlinked one is still open. Once a
  // follow-up is linked it is final — re-resolving re-fired escalation texts to clinicians.
  const open = c.status === 'scheduled' || c.status === 'sent' || (c.status === 'escalated' && !c.followupIntakeId);
  if (!open) return null;

  const [orig] = await db.select({ brief: intakeSessions.aiBrief }).from(intakeSessions).where(eq(intakeSessions.id, c.intakeSessionId)).limit(1);
  const origLevel = (orig?.brief as ClinicalBrief | null)?.disposition?.level ?? null;
  const fLevel = opts.followupBrief.disposition.level;
  const outcome = opts.outcome ?? c.outcome ?? null;
  const escalate = outcome === 'worse' || shouldEscalate(origLevel, fLevel);
  const note = escalate ? escalationNote(origLevel, fLevel, outcome) : null;

  await db
    .update(checkins)
    .set({
      status: escalate ? 'escalated' : 'answered',
      answeredAt: new Date(),
      followupIntakeId: opts.followupIntakeId,
      outcome: outcome ?? undefined,
      escalationNote: note,
    })
    .where(eq(checkins.id, c.id));

  return { escalated: escalate, note, intakeSessionId: c.intakeSessionId };
}

// ─── Escalation alerts to clinicians ─────────────────────────────────────────
// Text the clinician who completed the visit; if nobody did (or they opted out),
// text the online clinicians licensed in the patient's state. PHI-free: a date
// and an acuity word, never a complaint or a name.

import { clinicianProfiles, visits, patientProfiles } from '../db/schema.js';
import { sendSms, smsAvailable, shouldThrottle } from './sms.js';

const ESCALATION_TEXT_WINDOW_MS = 15 * 60 * 1000;

export function escalationText(visitDate: string, followupLevel: string | null | undefined, base: string): string {
  const level = followupLevel ? (ACUITY_LABEL[followupLevel as Acuity] ?? followupLevel) : null;
  const tri = level ? ` Follow-up triaged ${level}.` : '';
  return `Acute Insight: a patient you saw on ${visitDate} reports they are worse.${tri} Review: ${base}/provider`;
}

export async function notifyClinicianOfEscalation(opts: { intakeSessionId: number; patientUserId: string; followupLevel?: string | null; base: string }) {
  if (!smsAvailable()) return { texted: 0, to: 'none' as const };
  try {
    const [intake] = await db.select({ createdAt: intakeSessions.createdAt }).from(intakeSessions).where(eq(intakeSessions.id, opts.intakeSessionId)).limit(1);
    const when = intake?.createdAt ? intake.createdAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'a recent date';
    const text = escalationText(when, opts.followupLevel, opts.base);

    // 1. the treating clinician
    const [visit] = await db.select({ clinicianUserId: visits.clinicianUserId }).from(visits).where(eq(visits.intakeSessionId, opts.intakeSessionId)).limit(1);
    if (visit?.clinicianUserId) {
      const [c] = await db.select({ phone: clinicianProfiles.phone, notify: clinicianProfiles.notifySms }).from(clinicianProfiles).where(eq(clinicianProfiles.userId, visit.clinicianUserId)).limit(1);
      if (c?.phone && c.notify !== false && !shouldThrottle(`esc:${visit.clinicianUserId}:${opts.intakeSessionId}`, ESCALATION_TEXT_WINDOW_MS)) {
        const ok = await sendSms(c.phone, text);
        if (ok) return { texted: 1, to: 'treating' as const };
      }
    }

    // 2. fallback: online clinicians licensed in the patient's state
    const [p] = await db.select({ state: patientProfiles.state }).from(patientProfiles).where(eq(patientProfiles.userId, opts.patientUserId)).limit(1);
    if (!p?.state) return { texted: 0, to: 'none' as const };
    const online = await db
      .select({ userId: clinicianProfiles.userId, phone: clinicianProfiles.phone, licenses: clinicianProfiles.stateLicenses, notify: clinicianProfiles.notifySms })
      .from(clinicianProfiles)
      .where(eq(clinicianProfiles.online, true));
    const targets = online.filter((c) => c.phone && c.notify !== false && Array.isArray(c.licenses) && c.licenses.includes(p.state!) && !shouldThrottle(`esc:${c.userId}:${opts.intakeSessionId}`, ESCALATION_TEXT_WINDOW_MS));
    const results = await Promise.all(targets.map((c) => sendSms(c.phone!, text)));
    return { texted: results.filter(Boolean).length, to: 'online' as const };
  } catch (err) {
    console.error(JSON.stringify({ event: 'companion.escalation_sms.error', error: err instanceof Error ? err.message : String(err) }));
    return { texted: 0, to: 'none' as const };
  }
}
