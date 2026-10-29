import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { patientProfiles } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';
import { requireSession } from '../../../lib/session.js';

export default async function handler(req: Request, res: Response) {
  try {
    const session = await requireSession(req, res, 'patient');
    if (!session) return;

    const b = (req.body ?? {}) as Record<string, unknown>;
    const str = (v: unknown, max: number) => (v == null || v === '' ? null : typeof v === 'string' && v.trim().length <= max ? v.trim() : undefined);
    const list = (v: unknown) =>
      v == null ? null : Array.isArray(v) && v.length <= 50 && v.every((x) => typeof x === 'string' && x.length <= 200) ? v.map((x) => x.trim()).filter(Boolean) : undefined;
    const dateOfBirth = str(b.dateOfBirth, 16);
    const gender = str(b.gender, 32);
    const phone = str(b.phone, 32);
    const conditions = list(b.conditions);
    const medications = list(b.medications);
    const allergies = list(b.allergies);
    if ([dateOfBirth, gender, phone, conditions, medications, allergies].some((v) => v === undefined)) {
      return res.status(400).json({ error: 'Profile fields must be short text; conditions, medications and allergies must be lists of short text' });
    }
    if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return res.status(400).json({ error: 'Date of birth must be YYYY-MM-DD' });
    const state = typeof b.state === 'string' && /^[A-Za-z]{2}$/.test(b.state) ? b.state.toUpperCase() : undefined;

    const [existing] = await db
      .select({ id: patientProfiles.id })
      .from(patientProfiles)
      .where(eq(patientProfiles.userId, session.userId))
      .limit(1);

    if (existing) {
      await db
        .update(patientProfiles)
        .set({ dateOfBirth, gender, phone, conditions, medications, allergies, ...(state ? { state } : {}) })
        .where(eq(patientProfiles.userId, session.userId));
    } else {
      await db.insert(patientProfiles).values({
        userId: session.userId,
        dateOfBirth,
        gender,
        phone,
        conditions,
        medications,
        allergies,
        state: state ?? null,
      });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error(JSON.stringify({ event: 'api.error', route: 'patient/profile/PUT.ts', error: error instanceof Error ? error.message : String(error) }));
    res.status(500).json({ error: 'Failed to update profile' });
  }
}
