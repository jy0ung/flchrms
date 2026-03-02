# FLCHRMS Operations and Quality Specification

## 1. Environment and Runtime Requirements

### 1.1 Local development
- Node.js + npm
- Supabase project credentials for frontend env vars
- Optional Supabase CLI for local DB reset, migrations, and type generation

### 1.2 Required frontend env vars
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (or `VITE_SUPABASE_ANON_KEY` fallback)
- `VITE_SUPABASE_PROJECT_ID`

### 1.3 Edge function secrets (for email worker flows)
Set in Supabase secrets (not committed frontend env):
- `NOTIFICATION_EMAIL_PROVIDER`
- `NOTIFICATION_EMAIL_FROM`
- provider API key (example: Resend)

## 2. NPM Script Contract

### 2.1 App lifecycle
- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`
- `npm run test`

### 2.2 DB and SQL regression
- `npm run test:db:sql`
- `npm run test:rbac:sql`
- `npm run test:state:sql`

### 2.3 E2E suites
- `npm run test:rbac:e2e`
- `npm run test:rbac:e2e:phase3b`
- `npm run test:e2e:notifications`

### 2.4 Schema/bootstrap tooling
- `npm run db:bootstrap:verify:local`
- `npm run db:bootstrap:defaults:apply:local`
- `npm run db:bootstrap:platform:apply:local`
- `npm run db:snapshot:public`
- `npm run db:build:default-schema:compat`
- `npm run types:supabase:gen:local`

## 3. CI Pipeline Specification

Workflow file: `.github/workflows/ci.yml`

### 3.1 Trigger policy
- Push: `main`, `development`, version tags `v*`
- Pull request: `main`, `development`
- Manual dispatch with optional E2E flags

### 3.2 Jobs
1. `frontend-quality`
- install dependencies
- lint
- unit tests
- production build
- upload dist artifact

2. `db-sql-regression`
- start local Supabase stack
- reset DB and apply migrations
- run SQL regression suites
- apply bootstrap SQL idempotency checks
- regenerate Supabase types
- export schema snapshot + compatibility bundle
- verify generated artifacts are committed

3. optional E2E jobs (dispatch/tag controlled)
- RBAC phase 3B suite
- notifications phase 7 suite
- local Supabase-backed build + Playwright execution

## 4. Test Strategy and Coverage Snapshot

Current repository snapshot:
- Unit/component test files: 36
- Unit/component test cases: 106
- E2E spec files: 5
- SQL regression suites: 2

### 4.1 Unit/component scope
Covers:
- page behaviors (`Admin`, `Dashboard`, `Leave`, etc.)
- system component behavior
- permissions/admin-permissions logic
- leave workflow utility logic
- payroll and executive stats utility logic
- layout/customization logic

### 4.2 E2E scope
Covers:
- RBAC leave cancellations
- RBAC admin/director access
- RBAC calendar visibility
- notifications
- visual smoke checks

### 4.3 SQL regression scope
Covers:
- RLS and function grants
- hardening checks for security-definer function search paths
- leave workflow state-machine integrity
- notification queue/worker contract behavior
- strict masking behavior in employee directory RPC

## 5. Deployment Model

Based on `docs/deployment-guide.md`:
- Frontend is built static and served by Nginx.
- Supabase remains cloud-hosted backend.
- Optional HTTPS via Certbot.
- Deploy script supports branch/local/repo modes and skip flags.

### 5.1 First-user bootstrap
On fresh systems, first signup is promoted to admin (DB trigger logic); subsequent users default to employee role.

## 6. Operational Observability and Admin Controls

### 6.1 In-app operations surfaces
Admin -> Leave Policies includes:
- Workflow audit stream
- Notification queue operations dashboard
- Worker telemetry and dead-letter analytics

### 6.2 Queue operations
- Requeue/discard actions
- Worker run summaries
- Dead-letter rollups by provider/event/error fingerprint
- Local threshold-based queue health alerts for admins

## 7. Maintenance Contract

When making changes, update specs and run:
1. `npm run lint`
2. `npm run test`
3. `npm run test:db:sql` (when schema/auth changes)
4. `npm run types:supabase:gen:local` + schema snapshot scripts (when migrations/RPC change)

## 8. Known Operational Risks

- Supabase type drift currently exists for multiple frontend-consumed RPCs.
- In-flight migration (`leave_type_display_config`) is not yet connected to current UI logic.
- Some notification/admin data surfaces rely on polling and local thresholds; no push channel is currently implemented.
