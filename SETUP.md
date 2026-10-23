# Acute Insight AI — Running This Outside the Airo Builder

This codebase was exported from GoDaddy Airo and then upgraded (see **What changed** below).
It runs anywhere Node 22+ and MySQL/MariaDB are available.

## 1. Requirements

- Node.js 22+
- PostgreSQL 14+ (Supabase, Neon, RDS, or local)

## 2. Database

The app is on **Postgres** (ported from the original MySQL export). Credentials resolve in
this order (`src/server/db/config.ts`):

1. `DATABASE_URL` — full `postgres://` connection string (use Supabase's **transaction
   pooler** URI for serverless hosting)
2. `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASS` / `DB_NAME`
3. Legacy `$NOMAD_TASK_DIR/config.json` (Airo convention)

`DB_SSL=disable` turns TLS off for local dev; otherwise TLS is on with
`rejectUnauthorized: false` (fits Supabase/managed certs).

Apply the schema:

```bash
DATABASE_URL="postgres://user:pass@host:5432/dbname" npx drizzle-kit push
```

## 3. Secrets (environment variables)

| Variable | Required | Purpose |
|---|---|---|
| `BETTER_AUTH_SECRET` | Yes | Session encryption — `openssl rand -hex 32` |
| `ANTHROPIC_API_KEY` | For real AI | Activates Claude-powered intake chat + provider briefs. Without it, the app falls back to the built-in scripted intake engine. |
| `ANTHROPIC_CHAT_MODEL` | No | Default `claude-haiku-5-5` |
| `ANTHROPIC_SUMMARY_MODEL` | No | Default `claude-sonnet-5-5` |

## 4. Run

```bash
npm install
DATABASE_URL="postgres://acute:localdev@127.0.0.1:5432/acute_insight?sslmode=disable" \
  BETTER_AUTH_SECRET=<secret> ANTHROPIC_API_KEY=<key> npm run dev
```

**Production — Vercel (current setup):** the repo deploys as a static SPA (`vite build` →
`dist/client`, built remotely) plus one serverless function: `api/index.js`, a committed
esbuild bundle of the whole Express API (`src/server/app.ts`). After ANY change under
`src/server/` or `src/lib/`, regenerate it before pushing:

```bash
npm run build:api && git add api/index.js
```

Env vars the deployment needs (Vercel → Project → Settings → Environment Variables):
`DATABASE_URL` (Supabase transaction-pooler URI), `BETTER_AUTH_SECRET`,
`BETTER_AUTH_URL` (the site's public URL), and `ANTHROPIC_API_KEY` for real AI.
Optional: `BETTER_AUTH_TRUSTED_ORIGINS` (comma-separated) when serving custom domains.

**Production — standalone server (alternative):** `npm run build`, then run the SSR bundle
(`dist/entry.js`) under Node 22 with the same env vars. This path serves SSR'd pages;
the Vercel path serves the SPA.

## 5. Bootstrapping roles

Everyone signs up as a `patient`. Promote the first admin directly in SQL:

```sql
UPDATE user SET is_admin = 1 WHERE email = 'you@example.com';
```

Admins promote providers from the in-app admin panel (`/admin/providers`), or:

```sql
UPDATE user SET role = 'provider' WHERE email = 'doc@example.com';
```

## What changed vs. the raw Airo export

**Real AI (new):**
- `src/server/lib/ai.ts` — Claude Messages API integration: adaptive intake conversation
  (physician-written clinical protocol, one question per turn, emergency escalation, 988 referral)
  and structured provider briefs (JSON summary + clinical flags).
- `src/server/lib/intake-fallback.ts` — the original scripted engine, kept as an automatic
  fallback so the patient flow never breaks on an AI outage.
- `src/server/api/intake/chat/POST.ts` — AI-first with deterministic emergency screening that
  runs on **every** message regardless of the model; validates intake ownership; input limits.
- `src/server/api/intake/[id]/complete/POST.ts` — LLM provider brief, with deterministic flags
  (severity ≥8, chronicity, serious associated symptoms) always unioned in as a safety floor;
  verifies intake ownership before writing.

**Bug fixes & hardening:**
- Provider dashboard (`api/provider/intakes/GET.ts`): patient profiles now load for **all**
  patients (`inArray`) — previously only the first patient's profile was fetched.
- All API 500 responses no longer leak internal error details to clients; errors are logged
  server-side as structured JSON instead.
- `vitest.config.ts`: added missing `@/server` / `@` aliases so the server entry test resolves.
- Removed three orphaned test files that referenced Airo builder internals not present in the export.

**Truth-in-advertising copy pass (all `src/content/pages/*.json` + hardcoded TSX):**
- Removed fabricated metrics (94% completion, <4 min, 97% satisfaction, 2,400+ patients/mo, 48 states),
  the SOC 2 Type II / AES-256 / "fully HIPAA-compliant" certification claims, three fictional team
  members, fake patient and physician testimonials, fake insurance acceptance (Aetna/Cigna/UHC/BCBS),
  and fake provider-network promises (weekly pay, malpractice coverage).
- Repositioned honestly as a physician-founded **clinical-beta intake platform**: patients complete an
  adaptive AI intake; their provider gets a structured, flagged brief before the visit. No diagnosis,
  no prescribing, no care delivery claimed.
- Privacy language now states what is true today (encrypted in transit, role-based access, never sold)
  and names HIPAA readiness (encryption at rest, audit logging, BAAs) as a pre-GA checklist item.
- Testimonial sections render only when real, attributable quotes exist (arrays currently empty).

**Before real patients use this:** host on BAA-covered infrastructure, execute a BAA with the AI
vendor, add audit logging and encryption at rest, publish a real Privacy Policy/Terms, and have
counsel review the marketing claims. See the launch roadmap document.
