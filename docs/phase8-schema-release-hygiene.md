# Phase 8: Schema + Release Hygiene

This phase stabilizes how the project is reproduced, reviewed, and released after the large workflow/RBAC changes.

## Goals

1. Deterministic schema review snapshots (without depending on manual append edits)
2. Reproducible local DB bootstrap + verification
3. Regenerable Supabase TypeScript types from the current schema
4. Safer handoff to staging/UAT/release workflows

## New Commands

### 1. Bootstrap and verify local DB (migrations only)

```bash
npm run db:bootstrap:verify:local
```

What it does:
- starts local Supabase (if needed)
- resets local DB and reapplies migrations
- runs `npm run test:db:sql`

Tips:
- Useful variants:
  - `npm run db:bootstrap:verify:local:defaults` (also applies `bootstrap_defaults.sql`)
  - `npm run db:bootstrap:verify:local:seeded-defaults` (defaults + targeted fixtures)
- If your local Supabase stack is already running, prefer:
  ```bash
  bash scripts/db-bootstrap-verify-local.sh --skip-start
  ```
- First-time runs may be slow because Docker images are pulled.

### 2. Export a clean schema snapshot for review/diff

```bash
npm run db:snapshot:public
```

Output:
- `supabase/schema_snapshot.public.sql`

Notes:
- This is a **schema-only** snapshot of the `public` schema from the local Supabase DB.
- It intentionally does **not** replace `supabase/default_schema.sql` yet.
- `supabase/default_schema.sql` currently still acts as a bootstrap file and includes migration-era DDL + DML (default rows, policies, bucket provisioning, etc.).

### 3. Regenerate Supabase TS types from local schema

```bash
npm run types:supabase:gen:local
```

This regenerates:
- `src/integrations/supabase/types.ts`

Notes:
- The script first tries `supabase gen types --local`
- If that is unavailable (common when using a pre-running Docker stack instead of a CLI-managed session), it falls back to a direct DB connection using:
  1. published `supabase-pooler` port (preferred)
  2. published `supabase-db` port
  3. `supabase-db` container IP (Linux-host fallback)

### 4. Apply bootstrap defaults locally (Phase 8B split)

```bash
npm run db:bootstrap:defaults:apply:local
```

Applies:
- `supabase/bootstrap_defaults.sql`

This is the new dedicated defaults/bootstrap artifact (data only). It should be applied after migrations on a fresh database.

### 5. Apply platform bootstrap locally (Phase 8B split)

```bash
npm run db:bootstrap:platform:apply:local
```

Applies:
- `supabase/bootstrap_platform.sql`

This contains non-`public` app platform artifacts that are not captured by the `public` schema snapshot (for example `storage.objects` policies and `pg_cron` retention job registration).

### 6. Build compatibility `default_schema.sql` (generated)

```bash
npm run db:build:default-schema:compat
```

Generates:
- `supabase/default_schema.sql`

The compatibility bundle is generated from:
1. `supabase/schema_snapshot.public.sql`
2. `supabase/bootstrap_platform.sql`
3. `supabase/bootstrap_defaults.sql`

## Supabase CLI Version Pinning (Future-Proofing)

Phase 8A scripts default to a pinned Supabase CLI version for reproducibility:

```bash
SUPABASE_CLI_VERSION=2.76.14
```

Override per run if needed:

```bash
SUPABASE_CLI_VERSION=2.77.0 npm run types:supabase:gen:local
```

If the `supabase` binary is already installed on your machine, the scripts will use it directly (faster than `npx`).

## Phase 8B Split Status (Current)

Phase 8B has started with a safe split:
- `supabase/schema_snapshot.public.sql` (deterministic public schema snapshot)
- `supabase/bootstrap_platform.sql` (non-`public` app platform bootstrap artifacts)
- `supabase/bootstrap_defaults.sql` (curated app default rows/buckets)

`supabase/default_schema.sql` is now being moved to a generated compatibility-bundle role.

## Why `default_schema.sql` is not replaced yet (Phase 8B in progress)

`supabase/default_schema.sql` currently mixes:
- schema definitions
- policy/function changes across migrations
- bootstrap/default data inserts (e.g. workflow defaults / buckets)

Replacing it directly with the current schema-only `pg_dump` snapshot would silently drop:
- bootstrap/default rows
- non-`public` app artifacts still represented in the legacy file (for example storage bucket seed inserts/policies history)

The current safe path is:
1. keep using migrations as source of truth for actual DB setup
2. use `schema_snapshot.public.sql` + `bootstrap_platform.sql` + `bootstrap_defaults.sql` as reviewed artifacts
3. generate `default_schema.sql` as a compatibility bundle (no manual edits)
4. later decide whether to keep or deprecate the compatibility bundle

## Recommended Local Verification Sequence

```bash
npm run db:bootstrap:verify:local:seeded
npm run db:bootstrap:verify:local:seeded-defaults
npm run db:bootstrap:platform:apply:local
npm run types:supabase:gen:local
npm run db:snapshot:public
npm run db:build:default-schema:compat
npm run test
npm run build
```

## Staging / Release Workflow Alignment

- CI (`.github/workflows/ci.yml`) already runs:
  - lint/test/build
  - local Supabase DB SQL regression checks
  - `bootstrap_platform.sql` apply/idempotency validation
  - `bootstrap_defaults.sql` apply/idempotency validation
  - generated artifact drift checks (`types.ts` + `schema_snapshot.public.sql` + `default_schema.sql`)
  - optional E2E gates (tag/manual)
- Use the local bootstrap/verify command before cutting a release branch/tag to reduce migration drift risk.
