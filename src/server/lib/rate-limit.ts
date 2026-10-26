/**
 * Sliding-window rate limiter, in memory per instance. Enough to blunt
 * credential stuffing, chat abuse, and SMS/checkout spam for a pilot; swap the
 * store for Redis/Upstash when there is more than one warm instance.
 */
import type { Request, Response, NextFunction } from 'express';
import { clientIp } from './audit.js';

interface Bucket { hits: number[] }
const store = new Map<string, Bucket>();
let lastSweep = Date.now();

export interface RateLimitOpts {
  name: string;
  limit: number;
  windowMs: number;
  /** Key by user id when a session cookie is present, else by IP. */
  key?: (req: Request) => string;
}

export function check(key: string, limit: number, windowMs: number, now = Date.now()): { allowed: boolean; remaining: number; resetMs: number } {
  if (now - lastSweep > 60_000) {
    for (const [k, b] of store) if (b.hits.length === 0 || now - b.hits[b.hits.length - 1] > windowMs * 2) store.delete(k);
    lastSweep = now;
  }
  const b = store.get(key) ?? { hits: [] };
  b.hits = b.hits.filter((t) => now - t < windowMs);
  if (b.hits.length >= limit) {
    store.set(key, b);
    return { allowed: false, remaining: 0, resetMs: windowMs - (now - b.hits[0]) };
  }
  b.hits.push(now);
  store.set(key, b);
  return { allowed: true, remaining: limit - b.hits.length, resetMs: windowMs - (now - b.hits[0]) };
}

export function _reset() { store.clear(); }

function sessionKey(req: Request): string {
  // better-auth session cookie — opaque token, fine as a per-session key without decoding.
  const raw = req.headers.cookie ?? '';
  const m = /better-auth\.session_token=([^;]+)/.exec(raw);
  return m ? `s:${m[1].slice(0, 32)}` : `ip:${clientIp(req)}`;
}

export function rateLimit(opts: RateLimitOpts) {
  const keyFn = opts.key ?? sessionKey;
  return (req: Request, res: Response, next: NextFunction) => {
    const r = check(`${opts.name}:${keyFn(req)}`, opts.limit, opts.windowMs);
    res.setHeader('X-RateLimit-Limit', String(opts.limit));
    res.setHeader('X-RateLimit-Remaining', String(r.remaining));
    if (!r.allowed) {
      res.setHeader('Retry-After', String(Math.ceil(r.resetMs / 1000)));
      console.warn(JSON.stringify({ event: 'rate_limit.hit', name: opts.name, ip: clientIp(req) }));
      return res.status(429).json({ error: 'Too many requests — please wait a moment and try again.' });
    }
    next();
  };
}

export const byIp = (req: Request) => `ip:${clientIp(req)}`;
