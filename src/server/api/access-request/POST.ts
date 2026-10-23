import type { Request, Response } from 'express';
import { db } from '../../db/client.js';
import { accessRequests } from '../../db/schema.js';

/**
 * Public endpoint: a provider or clinic asks to join the beta.
 * Lightly defended: strict field limits, a honeypot field bots tend to fill,
 * and a per-instance submission cap as a backstop until real rate limiting.
 */
const MAX = { name: 160, email: 255, organization: 200, message: 2000 } as const;

let submissionsThisInstance = 0;
const INSTANCE_CAP = 200;

export default async function handler(req: Request, res: Response) {
  try {
    const { name, email, organization, message, website } = (req.body ?? {}) as Record<
      string,
      unknown
    >;

    // Honeypot: real users never see or fill this field.
    if (typeof website === 'string' && website.trim() !== '') {
      return res.status(200).json({ ok: true });
    }

    if (submissionsThisInstance >= INSTANCE_CAP) {
      return res.status(429).json({ error: 'Too many requests — please try again later.' });
    }

    if (typeof name !== 'string' || !name.trim() || name.length > MAX.name) {
      return res.status(400).json({ error: 'Please tell us your name.' });
    }
    if (
      typeof email !== 'string' ||
      email.length > MAX.email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (organization !== undefined && (typeof organization !== 'string' || organization.length > MAX.organization)) {
      return res.status(400).json({ error: 'Practice or organization is too long.' });
    }
    if (message !== undefined && (typeof message !== 'string' || message.length > MAX.message)) {
      return res.status(400).json({ error: 'Message is too long.' });
    }

    submissionsThisInstance++;

    await db.insert(accessRequests).values({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      organization: typeof organization === 'string' && organization.trim() ? organization.trim() : null,
      message: typeof message === 'string' && message.trim() ? message.trim() : null,
    });

    res.status(201).json({ ok: true });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'access_request.error',
        error: error instanceof Error ? error.message : String(error),
      })
    );
    res.status(500).json({ error: "Something went wrong — please try again." });
  }
}
