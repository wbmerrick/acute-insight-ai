/**
 * Drizzle Kit configuration for database migrations (Postgres).
 *
 * Usage:
 * - Generate migrations: npx drizzle-kit generate
 * - Apply schema directly: npx drizzle-kit push
 *
 * Configuration source: see src/server/db/config.ts
 * (DATABASE_URL, or DB_HOST/DB_PORT/DB_USER/DB_PASS/DB_NAME,
 * or legacy $NOMAD_TASK_DIR/config.json)
 */
import { defineConfig } from 'drizzle-kit';
import { getDatabaseCredentials } from './src/server/db/config';

const credentials = getDatabaseCredentials();

export default defineConfig({
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: credentials.host,
    port: credentials.port,
    user: credentials.user,
    password: credentials.password,
    database: credentials.database,
    ssl: credentials.ssl ? { rejectUnauthorized: false } : false,
  },
  verbose: true,
  strict: false,
});
