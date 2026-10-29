import type { Request, Response } from 'express';
import { eq, desc } from 'drizzle-orm';
import { db } from '../../../db/client.js';
import { patientAssignments, user } from '../../../db/schema.js';
import { requireAdmin } from '../../../lib/dispatch.js';
import { providerScope } from '../../../lib/scope.js';
import { alias } from 'drizzle-orm/pg-core';

export default async function handler(req: Request, res: Response) {
  try {
    const session = await requireAdmin(req, res);
    if (!session) return;
    const provider = alias(user, 'provider');
    const patient = alias(user, 'patient');
    const rows = await db
      .select({ id: patientAssignments.id, providerId: provider.id, providerName: provider.name, providerEmail: provider.email, patientId: patient.id, patientName: patient.name, patientEmail: patient.email, createdAt: patientAssignments.createdAt })
      .from(patientAssignments)
      .innerJoin(provider, eq(provider.id, patientAssignments.providerUserId))
      .innerJoin(patient, eq(patient.id, patientAssignments.patientUserId))
      .orderBy(desc(patientAssignments.createdAt))
      .limit(500);
    res.json({ scope: providerScope(), assignments: rows.map((r) => ({ ...r, createdAt: r.createdAt ? r.createdAt.toISOString() : null })) });
  } catch (error) {
    console.error(JSON.stringify({ event: 'admin.assignments.get.error', error: error instanceof Error ? error.message : String(error) }));
    res.status(500).json({ error: 'Failed to load assignments' });
  }
}
