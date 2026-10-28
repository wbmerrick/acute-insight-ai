-- Application role, grants, and row-level security.
-- Drizzle (src/server/db/schema.ts + drizzle/) owns tables, columns, constraints and indexes.
-- This file owns everything Drizzle does not: the app role, its grants, and RLS.
--
-- Fresh database:   npx drizzle-kit push   then   psql $DATABASE_URL -f db/roles-and-rls.sql
-- Existing database: safe to re-run (idempotent).
--
-- The server connects as acute_app, never as the owner/postgres role. acute_app can only
-- INSERT and SELECT on audit_events — the audit trail is append-only by privilege, not by code.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'acute_app') THEN
    CREATE ROLE acute_app LOGIN;   -- set the password out of band: ALTER ROLE acute_app PASSWORD '…';
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO acute_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO acute_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO acute_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO acute_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO acute_app;

-- Append-only audit trail
REVOKE UPDATE, DELETE, TRUNCATE ON audit_events FROM acute_app;

-- Row-level security: enabled on every table so that nothing is readable through
-- Supabase's PostgREST/anon paths. The app role gets an explicit allow-all policy;
-- authorization is enforced in the server (session role + PROVIDER_SCOPE).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'user','session','account','verification','two_factor',
    'intake_sessions','access_requests','patient_profiles','clinician_profiles',
    'visits','checkins','clinician_online_log','audit_events','patient_assignments'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname='app_all_'||t) THEN
      EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO acute_app USING (true) WITH CHECK (true)', 'app_all_'||t, t);
    END IF;
  END LOOP;
END $$;
