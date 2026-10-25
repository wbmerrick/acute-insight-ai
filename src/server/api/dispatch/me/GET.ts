import type { Request, Response } from 'express';
import { requireClinician, licensesOf, logErr } from '../../../lib/dispatch.js';

export default async function handler(req: Request, res: Response) {
  try {
    const ctx = await requireClinician(req, res);
    if (!ctx) return;
    const p = ctx.profile;
    res.json({
      displayName: p.displayName,
      credential: p.credential,
      stateLicenses: licensesOf(p),
      maxAcuity: p.maxAcuity ?? 'urgent',
      online: !!p.online,
    });
  } catch (error) {
    logErr('dispatch.me.get.error', error);
    res.status(500).json({ error: 'Failed to load clinician profile' });
  }
}
