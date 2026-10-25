import type { Request, Response } from 'express';
import { and, eq } from 'drizzle-orm';
import { db } from '../../../db/client.js';
import { visits, intakeSessions, patientProfiles, clinicianProfiles } from '../../../db/schema.js';
import { requirePatient, isUsState, DISPATCHABLE, logErr } from '../../../lib/dispatch.js';
import type { ClinicalBrief, Acuity } from '../../../../lib/clinical-brief.js';
import { sendSms, newVisitText, shouldThrottle, smsAvailable } from '../../../lib/sms.js';

const CLINICIAN_TEXT_WINDOW_MS = 10 * 60 * 1000;

/**
 * Patient requests a clinician for a completed intake — the "request a ride".
 * Body: { intakeId, state, phone? }. Emergency briefs are refused: that path is 911.
 */
export default async function handler(req: Request, res: Response) {
  try {
    const userId = await requirePatient(req, res);
    if (!userId) return;

    const { intakeId, state, phone } = (req.body ?? {}) as { intakeId?: unknown; state?: unknown; phone?: unknown };
    const id = Number(intakeId);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'intakeId required' });
    if (!isUsState(state)) return res.status(400).json({ error: 'A valid US state is required' });
    const st = state.toUpperCase();

    const [intake] = await db
      .select({ id: intakeSessions.id, status: intakeSessions.status, chiefComplaint: intakeSessions.chiefComplaint, brief: intakeSessions.aiBrief })
      .from(intakeSessions)
      .where(and(eq(intakeSessions.id, id), eq(intakeSessions.userId, userId)))
      .limit(1);
    if (!intake) return res.status(404).json({ error: 'Intake not found' });
    if (intake.status !== 'complete') return res.status(409).json({ error: 'Finish the intake first' });

    const brief = intake.brief as ClinicalBrief | null;
    const acuity = brief?.disposition?.level as Acuity | undefined;
    if (!acuity || !DISPATCHABLE.includes(acuity)) {
      // Emergency (or no brief) — refuse to queue. The UI already shows the 911 path.
      return res.status(409).json({ error: 'This intake needs emergency care, not a queued visit. Call 911.' });
    }

    // Remember where the patient is (and how to reach them) for next time.
    const profilePatch: Partial<typeof patientProfiles.$inferInsert> = { state: st };
    if (typeof phone === 'string' && phone.trim()) profilePatch.phone = phone.trim().slice(0, 32);
    const [existing] = await db.select({ id: patientProfiles.id }).from(patientProfiles).where(eq(patientProfiles.userId, userId)).limit(1);
    if (existing) await db.update(patientProfiles).set(profilePatch).where(eq(patientProfiles.userId, userId));
    else await db.insert(patientProfiles).values({ userId, ...profilePatch });

    // One request per intake — re-requesting returns the existing visit.
    const [prior] = await db.select({ id: visits.id, status: visits.status }).from(visits).where(eq(visits.intakeSessionId, id)).limit(1);
    if (prior) return res.json({ ok: true, visitId: prior.id, status: prior.status });

    const [created] = await db
      .insert(visits)
      .values({ intakeSessionId: id, patientUserId: userId, acuity, patientState: st, chiefComplaint: intake.chiefComplaint })
      .returning({ id: visits.id });

    res.json({ ok: true, visitId: created.id, status: 'queued' });

    // Fire-and-forget: text every online, opted-in clinician licensed in this state.
    void notifyClinicians(acuity, st, `${req.protocol}://${req.hostname}`);
  } catch (error) {
    logErr('dispatch.request.error', error);
    res.status(500).json({ error: 'Failed to request a clinician' });
  }
}

async function notifyClinicians(acuity: string, state: string, base: string) {
  if (!smsAvailable()) return;
  try {
    const online = await db
      .select({ userId: clinicianProfiles.userId, phone: clinicianProfiles.phone, licenses: clinicianProfiles.stateLicenses, notify: clinicianProfiles.notifySms })
      .from(clinicianProfiles)
      .where(eq(clinicianProfiles.online, true));
    const text = newVisitText(acuity, state, base);
    await Promise.all(
      online
        .filter((c) => c.phone && c.notify !== false && Array.isArray(c.licenses) && c.licenses.includes(state))
        .filter((c) => !shouldThrottle(`clin:${c.userId}`, CLINICIAN_TEXT_WINDOW_MS))
        .map((c) => sendSms(c.phone!, text)),
    );
  } catch (err) {
    logErr('dispatch.notify.error', err);
  }
}
