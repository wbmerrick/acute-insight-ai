import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../../../db/client.js';
import { user } from '../../../db/schema.js';
import { requireSession } from '../../../lib/session.js';
import { verifyAccountPassword, markReauthed } from '../../../lib/reauth.js';
import { logErr } from '../../../lib/dispatch.js';
import { audit, type AuditRole } from '../../../lib/audit.js';

/**
 * Step-up re-authentication: confirm the account password mid-session to unlock
 * sensitive actions (data export/delete, role changes, audit export, licensure
 * changes) for the next REAUTH_WINDOW_MINUTES. Body: { password }. Registered
 * behind the auth rate limit (20/15 min per IP), so guessing is bounded; every
 * attempt is audited with ids only.
 */
export default async function handler(req: Request, res: Response) {
  try {
    // The loosest idle limit — the clinical endpoints behind the gate enforce
    // their own 15-minute limit on every call regardless.
    const session = await requireSession(req, res, 'patient');
    if (!session) return;
    const { password } = (req.body ?? {}) as { password?: unknown };
    if (typeof password !== 'string' || !password) {
      return res.status(400).json({ error: 'Password required' });
    }
    const [u] = await db.select({ role: user.role, isAdmin: user.isAdmin }).from(user).where(eq(user.id, session.userId)).limit(1);
    const role: AuditRole = u?.isAdmin ? 'admin' : u?.role === 'provider' ? 'provider' : 'patient';

    const result = await verifyAccountPassword(session.userId, password.slice(0, 256));
    if (result === 'no_password') {
      audit(req, { action: 'auth.reauth', actorUserId: session.userId, actorRole: role, resourceType: 'session', meta: { ok: false, reason: 'no_password' } });
      return res.status(400).json({ error: 'This account has no password on file, so it cannot confirm one' });
    }
    if (result === 'bad') {
      audit(req, { action: 'auth.reauth', actorUserId: session.userId, actorRole: role, resourceType: 'session', meta: { ok: false } });
      return res.status(401).json({ error: 'Incorrect password' });
    }
    await markReauthed(session.sessionId);
    audit(req, { action: 'auth.reauth', actorUserId: session.userId, actorRole: role, resourceType: 'session', meta: { ok: true } });
    res.json({ ok: true });
  } catch (error) {
    logErr('auth.reauth.error', error);
    res.status(500).json({ error: 'Could not confirm your password' });
  }
}
