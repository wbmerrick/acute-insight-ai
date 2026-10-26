/**
 * Minimum necessary: which patients a provider may see.
 *   PROVIDER_SCOPE=all       (default) — single-practice pilot: every provider sees every intake.
 *   PROVIDER_SCOPE=assigned  — a provider sees patients assigned to them by an admin, plus any
 *                              patient whose dispatched visit they accepted. Admins always see all.
 */
import { eq, or } from 'drizzle-orm';
import { db } from '../db/client.js';
import { patientAssignments, visits } from '../db/schema.js';

export function providerScope(): 'all' | 'assigned' {
  return process.env.PROVIDER_SCOPE === 'assigned' ? 'assigned' : 'all';
}

/** null = unrestricted. Otherwise the set of patient ids this provider may see. */
export async function visiblePatientIds(providerUserId: string, isAdmin: boolean): Promise<Set<string> | null> {
  if (isAdmin || providerScope() === 'all') return null;
  const [assigned, treated] = await Promise.all([
    db.select({ id: patientAssignments.patientUserId }).from(patientAssignments).where(eq(patientAssignments.providerUserId, providerUserId)),
    db.select({ id: visits.patientUserId }).from(visits).where(or(eq(visits.clinicianUserId, providerUserId))),
  ]);
  return new Set([...assigned.map((r) => r.id), ...treated.map((r) => r.id)]);
}
