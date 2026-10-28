import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../../../../db/client.js';
import { clinicianProfiles, user } from '../../../../db/schema.js';
import { requireClinician, logErr, publicBaseUrl } from '../../../../lib/dispatch.js';
import { connectEnabled, createConnectAccount, createAccountLink } from '../../../../lib/stripe.js';

/** Start (or resume) Stripe Express onboarding so the clinician can receive transfers. */
export default async function handler(req: Request, res: Response) {
  try {
    const ctx = await requireClinician(req, res);
    if (!ctx) return;
    if (!connectEnabled()) return res.status(503).json({ error: 'Payouts are not enabled yet' });

    let accountId = ctx.profile.stripeAccountId;
    if (!accountId) {
      const [u] = await db.select({ email: user.email }).from(user).where(eq(user.id, ctx.userId)).limit(1);
      const acct = await createConnectAccount(u?.email ?? '', ctx.userId);
      accountId = acct.id;
      await db.update(clinicianProfiles).set({ stripeAccountId: accountId }).where(eq(clinicianProfiles.userId, ctx.userId));
    }
    const base = publicBaseUrl(req);
    const link = await createAccountLink(accountId, `${base}/clinician?connect=refresh`, `${base}/clinician?connect=done`);
    res.json({ ok: true, url: link.url });
  } catch (error) {
    logErr('dispatch.connect.onboard.error', error);
    res.status(500).json({ error: 'Could not start payout setup' });
  }
}
