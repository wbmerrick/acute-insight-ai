/**
 * Open-beta usage, aggregate only. Counts how many signed-out visitors talk to
 * Ace — guest messages and conversations started — per UTC day, and nothing
 * else: no IPs, no user agents, no text, no identifiers of any kind. This is
 * the checklist's own allowed shape of measurement (first-party, cookieless,
 * server-side) and it is fire-and-forget: a stats failure never touches the
 * patient-facing reply.
 */
import { sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { betaChatStats } from '../db/schema.js';

/** Today as a UTC calendar date, "YYYY-MM-DD" — the counter's bucket. */
export function utcDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Record one guest chat message (and, when it is the conversation's first
 * patient turn, one conversation started). Fire-and-forget by design.
 */
export function recordGuestChat(firstTurn: boolean, now = new Date()): void {
  void db
    .insert(betaChatStats)
    .values({ day: utcDay(now), messages: 1, conversations: firstTurn ? 1 : 0 })
    .onConflictDoUpdate({
      target: betaChatStats.day,
      set: {
        messages: sql`${betaChatStats.messages} + 1`,
        conversations: sql`${betaChatStats.conversations} + ${firstTurn ? 1 : 0}`,
      },
    })
    .catch((err) => {
      console.error(JSON.stringify({ event: 'beta.stats.error', error: err instanceof Error ? err.message : String(err) }));
    });
}
