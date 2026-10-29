/**
 * Step-up re-authentication ("sudo mode") for sensitive actions.
 *
 * A signed-in session is enough to use the product, but a few actions deserve a
 * fresh proof of identity even on a borrowed or walked-away-from device:
 * exporting or deleting a patient's record, changing a user's role, exporting
 * the audit trail, and changing the licenses/scope/credential that decide which
 * patients a clinician can see. Those endpoints call requireRecentAuth(): the
 * session must have proven the account password within REAUTH_WINDOW_MINUTES
 * (default 10) — at sign-in (session.createdAt is the sign-in moment, where the
 * password or TOTP was entered) or since, via POST /api/auth/reauth. Otherwise
 * the request is answered 403 { code: 'reauth_required' }; the client shows a
 * password prompt, confirms, and retries.
 *
 * REQUIRE_REAUTH=off disables the gate (lockout escape hatch; leave it on).
 */
import type { Request, Response } from 'express';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { session as sessionTable, account as accountTable } from '../db/schema.js';
import { getAuth } from '../../lib/auth/auth.js';

const DEFAULT_WINDOW_MIN = 10;

/** Window in ms, or null when the gate is switched off. Clamped to 1 min – 12 h (the session lifetime). */
export function reauthWindowMs(env: Record<string, string | undefined> = process.env): number | null {
  if ((env.REQUIRE_REAUTH ?? '').toLowerCase() === 'off') return null;
  const raw = Number(env.REAUTH_WINDOW_MINUTES ?? DEFAULT_WINDOW_MIN);
  const minutes = Number.isFinite(raw) && raw > 0 ? Math.min(raw, 12 * 60) : DEFAULT_WINDOW_MIN;
  return Math.max(1, minutes) * 60_000;
}

/** Pure check: has this session proven the password recently enough? */
export function isRecentAuth(
  lastReauthAt: Date | null,
  createdAt: Date | null,
  windowMs: number,
  now = new Date(),
): boolean {
  const basis = [lastReauthAt, createdAt]
    .filter((d): d is Date => d instanceof Date)
    .reduce<Date | null>((a, b) => (a && a > b ? a : b), null);
  if (!basis) return false;
  return now.getTime() - basis.getTime() <= windowMs;
}

/**
 * Gate a sensitive handler. Call AFTER the role gate (requirePatient /
 * requireClinician / requireAdmin), so only an authorized caller ever sees the
 * reauth prompt. Writes the 403 itself and returns false when a fresh password
 * confirmation is needed; the client catches code 'reauth_required', prompts,
 * POSTs /api/auth/reauth, and retries.
 */
export async function requireRecentAuth(req: Request, res: Response): Promise<boolean> {
  const windowMs = reauthWindowMs();
  if (windowMs === null) return true; // REQUIRE_REAUTH=off
  const s = await getAuth()
    .api.getSession({ headers: new Headers(req.headers as Record<string, string>) })
    .catch(() => null);
  if (!s?.session?.id) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  const [row] = await db
    .select({ lastReauthAt: sessionTable.lastReauthAt, createdAt: sessionTable.createdAt })
    .from(sessionTable)
    .where(eq(sessionTable.id, s.session.id))
    .limit(1);
  if (row && isRecentAuth(row.lastReauthAt, row.createdAt, windowMs)) return true;
  res.status(403).json({ error: 'Please confirm your password to continue', code: 'reauth_required' });
  return false;
}

/**
 * Check the signed-in user's password against the credential account.
 * 'no_password' means an account with no password on file (e.g. social sign-in),
 * which can never pass the gate — the UI says so instead of looping.
 */
export async function verifyAccountPassword(userId: string, password: string): Promise<'ok' | 'bad' | 'no_password'> {
  const [acct] = await db
    .select({ password: accountTable.password })
    .from(accountTable)
    .where(and(eq(accountTable.userId, userId), eq(accountTable.providerId, 'credential')))
    .limit(1);
  if (!acct?.password) return 'no_password';
  const ctx = await getAuth().$context;
  const ok = await ctx.password.verify({ hash: acct.password, password });
  return ok ? 'ok' : 'bad';
}

/** Stamp the session as freshly re-authenticated. */
export async function markReauthed(sessionId: string, now = new Date()): Promise<void> {
  await db.update(sessionTable).set({ lastReauthAt: now }).where(eq(sessionTable.id, sessionId));
}
