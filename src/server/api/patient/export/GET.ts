import type { Request, Response } from 'express';
import { eq, desc } from 'drizzle-orm';
import { db } from '../../../db/client.js';
import { user, patientProfiles, intakeSessions, visits, checkins, clinicianProfiles } from '../../../db/schema.js';
import { requirePatient, logErr } from '../../../lib/dispatch.js';
import { audit } from '../../../lib/audit.js';

/** Right of access: everything we hold about this patient, as a JSON download. */
export default async function handler(req: Request, res: Response) {
  try {
    const userId = await requirePatient(req, res);
    if (!userId) return;

    const [u] = await db.select({ id: user.id, name: user.name, email: user.email, emailVerified: user.emailVerified, createdAt: user.createdAt }).from(user).where(eq(user.id, userId)).limit(1);
    const [profile] = await db.select().from(patientProfiles).where(eq(patientProfiles.userId, userId)).limit(1);
    const intakes = await db.select().from(intakeSessions).where(eq(intakeSessions.userId, userId)).orderBy(desc(intakeSessions.createdAt));
    const vs = await db
      .select({ id: visits.id, intakeSessionId: visits.intakeSessionId, acuity: visits.acuity, patientState: visits.patientState, status: visits.status, queuedAt: visits.queuedAt, acceptedAt: visits.acceptedAt, completedAt: visits.completedAt, paymentStatus: visits.paymentStatus, amountCents: visits.amountCents, clinicianName: clinicianProfiles.displayName, clinicianCredential: clinicianProfiles.credential })
      .from(visits)
      .leftJoin(clinicianProfiles, eq(clinicianProfiles.userId, visits.clinicianUserId))
      .where(eq(visits.patientUserId, userId));
    const cs = await db.select({ id: checkins.id, intakeSessionId: checkins.intakeSessionId, reason: checkins.reason, dueAt: checkins.dueAt, status: checkins.status, outcome: checkins.outcome, answeredAt: checkins.answeredAt, escalationNote: checkins.escalationNote }).from(checkins).where(eq(checkins.patientUserId, userId));

    const payload = {
      exportedAt: new Date().toISOString(),
      about: 'Everything Acute Insight holds about you. Intake briefs are AI-prepared drafts for your clinician, not a diagnosis.',
      account: u,
      profile: profile ? { dateOfBirth: profile.dateOfBirth, gender: profile.gender, phone: profile.phone, state: profile.state, conditions: profile.conditions, medications: profile.medications, allergies: profile.allergies } : null,
      intakes: intakes.map((i) => ({ id: i.id, status: i.status, chiefComplaint: i.chiefComplaint, yourAnswers: i.responses, draftSummary: i.aiSummary, flags: i.aiFlags, brief: i.aiBrief, providerName: i.providerName, createdAt: i.createdAt })),
      visits: vs,
      checkins: cs,
    };

    audit(req, { action: 'patient.export', actorUserId: userId, actorRole: 'patient', resourceType: 'user', resourceId: userId, patientUserId: userId, meta: { intakes: intakes.length, visits: vs.length } });
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="acute-insight-my-data-${new Date().toISOString().slice(0, 10)}.json"`);
    res.send(JSON.stringify(payload, null, 2));
  } catch (error) {
    logErr('patient.export.error', error);
    res.status(500).json({ error: 'Failed to export your data' });
  }
}
