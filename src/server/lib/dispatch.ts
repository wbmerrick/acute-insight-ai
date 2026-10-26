/**
 * Dispatch rules — the part of the marketplace that must never be wrong.
 *
 *  - A visit is only ever shown to a clinician licensed in the patient's state.
 *  - A visit is only shown to a clinician whose scope covers its acuity.
 *  - Emergency dispositions never enter the queue. That path is 911.
 *  - Accepting is atomic and first-wins (UPDATE ... WHERE status = 'queued').
 */
import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { clinicianProfiles, user } from '../db/schema.js';
import { getAuth } from '../../lib/auth/auth.js';
import { ACUITY_LEVELS, type Acuity } from '../../lib/clinical-brief.js';

export const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME',
  'MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI',
  'SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
] as const;
const STATE_SET = new Set<string>(US_STATES);

/** REQUIRE_MFA_CLINICIANS=true → clinicians/admins must have MFA on to reach patient data. */
export function mfaRequired(): boolean {
  return process.env.REQUIRE_MFA_CLINICIANS === 'true';
}

export function isUsState(s: unknown): s is string {
  return typeof s === 'string' && STATE_SET.has(s.toUpperCase());
}

/** Acuities that can be dispatched to a marketplace clinician. */
export const DISPATCHABLE: Acuity[] = ['urgent', 'telehealth', 'routine', 'selfcare'];
/** Scopes a clinician can set as the highest acuity they will accept. */
export const SCOPE_OPTIONS: Acuity[] = ['urgent', 'telehealth', 'routine'];

/** Lower index = higher acuity. A clinician with maxAcuity 'telehealth' can take telehealth, routine, selfcare — not urgent. */
export function scopeCovers(maxAcuity: string | null | undefined, acuity: string): boolean {
  const max = ACUITY_LEVELS.indexOf((maxAcuity ?? 'urgent') as Acuity);
  const a = ACUITY_LEVELS.indexOf(acuity as Acuity);
  if (max < 0 || a < 0) return false;
  return a >= max;
}

export interface ClinicianCtx {
  userId: string;
  isAdmin: boolean;
  profile: typeof clinicianProfiles.$inferSelect;
}

/**
 * Resolve the signed-in clinician (provider or admin role) and their dispatch
 * profile, creating a default offline profile on first touch. Writes the
 * 401/403 itself and returns null so handlers can `if (!ctx) return`.
 */
export async function requireClinician(req: Request, res: Response): Promise<ClinicianCtx | null> {
  const session = await getAuth().api.getSession({
    headers: new Headers(req.headers as Record<string, string>),
  });
  if (!session?.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  const [u] = await db.select().from(user).where(eq(user.id, session.user.id)).limit(1);
  if (!u || (u.role !== 'provider' && !u.isAdmin)) {
    res.status(403).json({ error: 'Clinician access required' });
    return null;
  }
  if (mfaRequired() && !u.twoFactorEnabled) {
    res.status(403).json({ error: 'Two-step verification is required for clinician access', code: 'mfa_required' });
    return null;
  }
  let [profile] = await db
    .select()
    .from(clinicianProfiles)
    .where(eq(clinicianProfiles.userId, u.id))
    .limit(1);
  if (!profile) {
    [profile] = await db
      .insert(clinicianProfiles)
      .values({ userId: u.id, displayName: u.name ?? null, stateLicenses: [], online: false })
      .returning();
  }
  return { userId: u.id, isAdmin: !!u.isAdmin, profile };
}

export function licensesOf(profile: { stateLicenses: unknown }): string[] {
  const raw = profile.stateLicenses;
  return Array.isArray(raw) ? raw.filter(isUsState).map((s) => s.toUpperCase()) : [];
}

export async function requirePatient(req: Request, res: Response): Promise<string | null> {
  const session = await getAuth().api.getSession({
    headers: new Headers(req.headers as Record<string, string>),
  });
  if (!session?.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return session.user.id;
}

export function logErr(event: string, error: unknown) {
  console.error(JSON.stringify({ event, error: error instanceof Error ? error.message : String(error) }));
}
