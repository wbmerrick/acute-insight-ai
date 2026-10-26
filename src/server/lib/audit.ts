/**
 * Audit trail — who did what to whose record. Append-only (the DB role cannot
 * UPDATE/DELETE audit_events in production). Ids and action names only; this
 * must never carry clinical text, request bodies, or contact details.
 *
 * Fire-and-forget: an audit write failure is logged, never surfaced to the user
 * and never blocks the clinical action.
 */
import type { Request } from 'express';
import { db } from '../db/client.js';
import { auditEvents } from '../db/schema.js';

export type AuditRole = 'patient' | 'provider' | 'admin' | 'system' | 'anon';

export interface AuditInput {
  action: string;
  actorUserId?: string | null;
  actorRole?: AuditRole;
  resourceType?: string;
  resourceId?: string | number | null;
  patientUserId?: string | null;
  meta?: Record<string, string | number | boolean | null>;
}

export function clientIp(req: Request): string {
  const xf = req.headers['x-forwarded-for'];
  const first = Array.isArray(xf) ? xf[0] : (xf ?? '').split(',')[0];
  return (first || req.ip || '').trim().slice(0, 64);
}

/** Strip anything that looks like free text — meta is for ids, counts, enums. */
function safeMeta(meta?: AuditInput['meta']): Record<string, unknown> | null {
  if (!meta) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (typeof v === 'string' && v.length > 64) continue; // free text — drop
    out[k] = v;
  }
  return Object.keys(out).length ? out : null;
}

export function audit(req: Request | null, input: AuditInput): void {
  const row = {
    actorUserId: input.actorUserId ?? null,
    actorRole: input.actorRole ?? (input.actorUserId ? 'patient' : 'anon'),
    action: input.action.slice(0, 64),
    resourceType: input.resourceType ?? null,
    resourceId: input.resourceId == null ? null : String(input.resourceId).slice(0, 64),
    patientUserId: input.patientUserId ?? null,
    ip: req ? clientIp(req) : null,
    userAgent: req ? String(req.headers['user-agent'] ?? '').slice(0, 255) : null,
    meta: safeMeta(input.meta),
  };
  db.insert(auditEvents)
    .values(row)
    .catch((err: unknown) => console.error(JSON.stringify({ event: 'audit.write_failed', action: row.action, error: err instanceof Error ? err.message : String(err) })));
}
