/**
 * Database connection setup using Drizzle ORM with node-postgres (pg).
 *
 * The pool is created LAZILY on first query rather than at import time, so
 * importing API handlers (tests, cold serverless starts, build steps) never
 * fails just because database credentials aren't present yet.
 */

import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { getDatabaseCredentials } from './config';
import * as schema from './schema';

type Db = NodePgDatabase<typeof schema>;

let _pool: pg.Pool | null = null;
let _db: Db | null = null;

function getDb(): Db {
  if (_db) return _db;

  const cfg = getDatabaseCredentials();
  _pool = new pg.Pool({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    ssl: cfg.ssl ? { rejectUnauthorized: false } : undefined,
    max: 10,
    // Serverless-friendly: don't hold idle connections open for long.
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  _db = drizzle(_pool, { schema });
  return _db;
}

/**
 * Lazy proxy: behaves exactly like the Drizzle instance, but connects only
 * when the first query is made.
 */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop, _receiver) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(real) : value;
  },
});

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    getDb();
    const client = await _pool!.connect();
    try {
      await client.query('SELECT 1');
    } finally {
      client.release();
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Close database connection pool
 */
export async function closeConnection(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
    _db = null;
  }
}
