import type { Request, Response } from 'express';
import { getAuth } from '../../../lib/auth/auth.js';
import { getSecret } from '#airo/secrets';

// TEMPORARY diagnostic. Authenticated-only. Returns no secret material —
// only presence/length and live API status codes — to diagnose why the
// AI intake is falling back. Remove after use.
export default async function handler(req: Request, res: Response) {
  try {
    const session = await getAuth().api.getSession({
      headers: new Headers(req.headers as Record<string, string>),
    });
    if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });

    const key = getSecret('ANTHROPIC_API_KEY');
    const keyStr = typeof key === 'string' ? key.trim() : '';
    const out: Record<string, unknown> = {
      keyPresent: keyStr.length > 0,
      keyLen: keyStr.length,
      keyPrefix: keyStr.slice(0, 7), // "sk-ant-" if a normal key; not secret
    };

    if (keyStr) {
      for (const model of ['claude-haiku-5-5', 'claude-sonnet-5-5']) {
        try {
          const r = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-api-key': keyStr,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({ model, max_tokens: 8, messages: [{ role: 'user', content: 'hi' }] }),
          });
          const body = await r.text();
          out[model] = { status: r.status, detail: r.ok ? 'ok' : body.slice(0, 180) };
        } catch (e) {
          out[model] = { status: 'fetch_failed', detail: e instanceof Error ? e.message : String(e) };
        }
      }
    }

    res.json(out);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
}
