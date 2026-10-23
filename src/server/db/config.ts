/**
 * Database configuration loader (Postgres).
 *
 * Resolution order:
 *  1. DATABASE_URL (full postgres:// connection string)
 *  2. DB_HOST / DB_PORT / DB_USER / DB_PASS / DB_NAME environment variables
 *  3. $NOMAD_TASK_DIR/config.json (legacy Airo container convention)
 *
 * DB_SSL=disable turns TLS off (local development); anything else connects
 * with TLS (rejectUnauthorized: false — managed hosts like Supabase use
 * certificates not in the default trust store).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { env } from 'node:process';

export interface DatabaseCredentials {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: boolean;
}

function sslEnabled(): boolean {
  return (env.DB_SSL ?? '').toLowerCase() !== 'disable';
}

export function getDatabaseCredentials(): DatabaseCredentials {
  // 1. Full connection string
  if (env.DATABASE_URL) {
    const url = new URL(env.DATABASE_URL);
    return {
      host: url.hostname,
      port: url.port ? parseInt(url.port, 10) : 5432,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, '') || 'postgres',
      ssl: url.searchParams.get('sslmode') === 'disable' ? false : sslEnabled(),
    };
  }

  // 2. Discrete environment variables
  if (env.DB_HOST && env.DB_USER && env.DB_NAME) {
    return {
      host: env.DB_HOST,
      port: env.DB_PORT ? parseInt(env.DB_PORT, 10) : 5432,
      user: env.DB_USER,
      password: env.DB_PASS ?? '',
      database: env.DB_NAME,
      ssl: sslEnabled(),
    };
  }

  // 3. Legacy Airo task-local config file
  const configPath = join(env.NOMAD_TASK_DIR || '/local', 'config.json');

  if (!existsSync(configPath)) {
    throw new Error(
      `Database not configured: set DATABASE_URL (or DB_HOST/DB_USER/DB_NAME), or provide ${configPath}`
    );
  }

  try {
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));

    if (!config.DATABASE?.VALUE) {
      throw new Error('Invalid config.json structure: DATABASE.VALUE not found');
    }

    const db = config.DATABASE.VALUE;

    if (!db.HOST || !db.PORT || !db.USERNAME || !db.PASSWORD || !db.NAME) {
      throw new Error('Invalid config.json: Missing required database credentials');
    }

    return {
      host: db.HOST,
      port: parseInt(String(db.PORT), 10),
      user: db.USERNAME,
      password: db.PASSWORD,
      database: db.NAME,
      ssl: db.SSL === false ? false : sslEnabled(),
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse ${configPath}: Invalid JSON format`);
    }
    throw error;
  }
}
