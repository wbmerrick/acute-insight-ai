import type { Request, Response } from 'express';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../../../../../db/client.js';
import { visits } from '../../../../../db/schema.js';
import { requirePatient, logErr } from '../../../../../lib/dispatch.js';
import { settleCancelledVisit } from '../../../../../lib/stripe.js';
import { audit } from '../../../../../lib/audit.js';

/** Patient withdraws a request that nobody has accepted yet. Any card hold is released. */
export default async function handler(req: Request, res: Response) {
  try {
    const userId = await requirePatient(req, res);
    if (!userId) return;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid visit id' });

    const [v] = await db
      .update(visits)
      .set({ status: 'cancelled' })
      .where(and(eq(visits.id, id), eq(visits.patientUserId, userId), inArray(visits.status, ['queued', 'pending_payment'])))
      .returning({ id: visits.id, paymentStatus: visits.paymentStatus, pi: visits.stripePaymentIntent, checkout: visits.stripeCheckoutId });
    if (!v) return res.status(409).json({ error: 'This visit can no longer be cancelled' });

    const money = await settleCancelledVisit(v);
    audit(req, { action: 'visit.cancel', actorUserId: userId, actorRole: 'patient', resourceType: 'visit', resourceId: id, patientUserId: userId, meta: { money } });
    res.json({ ok: true });
  } catch (error) {
    logErr('dispatch.cancel.error', error);
    res.status(500).json({ error: 'Failed to cancel' });
  }
}
