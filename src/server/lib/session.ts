/**
 * Server-side idle logoff. The browser's IdleGuard signs out after 15 minutes
 * (clinical) / 30 minutes (patient) of inactivity — but a stolen cookie, a tab
 * with JavaScript off, or a scripted client never runs that code. This makes the
 * server the authority: every authenticated API call records activity on the
 * session row, and a session that has been idle past its limit is destroyed and
 * answered with 401 { code: 'idle' }.
 */
import type { Request, Response } from 'express';
import { and, eq, lt, or, isNull } from 'drizzle-orm';
import { db } from '../db/client.js';
import { session as sessionTable } from '../db/schema.js';
import { getAuth } from '../../lib/auth/auth.js';

export const IDLE_MS = { clinical: 15 * 60_000, patient: 30 * 60_000 } as const;
const TOUCH_EVERY_MS = 60_000; // don't write on every poll

export interface SessionCtx {
  userId: string;
  sessionId: string;
  isAdmin: boolean;
  name: string | null;
  email: string;
}

/**
 * Resolve the session and enforce the idle limit for this kind of surface.
 * Returns null after writing the response (401) when there is no live session.
 */
export async function requireSession(req: Request, res: Response, kind: keyof typeof IDLE_MS): Promise<SessionCtx | null> {
  const s = await getAuth()
    .api.getSession({ headers: new Headers(req.headers as Record<string, string>) })
    .catch(() => null);
  if (!s?.user || !s.session?.id) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  const live = await touchSession(s.session.id, IDLE_MS[kind]);
  if (!live) {
    res.status(401).json({ error: 'Signed out after inactivity', code: 'idle' });
    return null;
  }
  const u = s.user as { id: string; name?: string | null; email: string; isAdmin?: boolean | null };
  return { userId: u.id, sessionId: s.session.id, isAdmin: !!u.isAdmin, name: u.name ?? null, email: u.email };
}

/**
 * Record activity; returns false (and deletes the session) if it has been idle
 * longer than limitMs. A session that predates this column counts from now.
 */
export async function touchSession(sessionId: string, limitMs: number, now = new Date()): Promise<boolean> {
  const cutoff = new Date(now.getTime() - limitMs);
  // Idle too long → gone. One statement, so two concurrent requests can't both revive it.
  const [expired] = await db
    .delete(sessionTable)
    .where(and(eq(sessionTable.id, sessionId), lt(sessionTable.lastActiveAt, cutoff)))
    .returning({ id: sessionTable.id });
  if (expired) return false;
  // Still live: stamp it (throttled).
  const stampBefore = new Date(now.getTime() - TOUCH_EVERY_MS);
  await db
    .update(sessionTable)
    .set({ lastActiveAt: now })
    .where(and(eq(sessionTable.id, sessionId), or(isNull(sessionTable.lastActiveAt), lt(sessionTable.lastActiveAt, stampBefore))));
  return true;
}
