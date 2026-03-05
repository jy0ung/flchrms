# Production Admin Flow Audit Report — AUDIT_2026-03-05_ADMIN_FLOW

## Scope
- Environment: Production (`https://e-leave.protonfookloi.com`)
- Actor: `jamri.saidi` (resolved to `flit092023@gmail.com`)
- Flows audited: Create, Read, Update, Reset Password, Archive/Restore (delete semantics), backend hard-delete boundary
- Execution window (UTC): 2026-03-05 02:47:08

## Canary
- Email: `audit-admin-flow-20260305t024012z@flchrms.test`
- User ID: `8c118650-1ab1-46d5-8ad8-0c95922317b1`
- Cleanup: hard-deleted from `auth.users` and cascades verified

## Findings (ordered by severity)

### S1 — Admin create employee fails when optional profile fields are provided
- Impact: Core admin create flow fails when request includes `_phone`, `_job_title`, department/manager/hire-date patches.
- Expected: Admin create succeeds with optional profile fields.
- Actual: RPC returns `42501` with message `Admin can only update username aliases from this endpoint.`
- Likely root cause: Trigger `public.enforce_profiles_admin_update_scope()` blocks any admin profile updates except `username`; `admin_create_employee` updates profile optional fields post-create.
- Code references:
  - [20260224143000_7a6b1d1f-5a8d-43d0-9b6c-2f3e0c8d4a12.sql](/home/hrms_admin/projects/flchrms/supabase/migrations/20260224143000_7a6b1d1f-5a8d-43d0-9b6c-2f3e0c8d4a12.sql:36)
  - [20260305003000_admin_capability_matrix.sql](/home/hrms_admin/projects/flchrms/supabase/migrations/20260305003000_admin_capability_matrix.sql:592)
- Evidence:
  - `output/audit/AUDIT_2026-03-05/logs/admin-flow/flow-04-create-employee.json`
  - `output/audit/AUDIT_2026-03-05/logs/admin-flow/flow-04-create-employee-body.json`

### S1 — Admin employee update and archive actions are blocked (non-username updates)
- Impact: Admin cannot perform update or archive (`status=terminated`) in employee management; CRUD lifecycle broken.
- Expected: Admin with `manage_employee_directory=true` can update profile fields and archive/restore.
- Actual: PATCH returns `42501` for field updates and archive attempts.
- Likely root cause: same trigger restriction mismatch with new capability model.
- Evidence:
  - `output/audit/AUDIT_2026-03-05/logs/admin-flow/flow-10-update-profile.json`
  - `output/audit/AUDIT_2026-03-05/logs/admin-flow/flow-17-archive-profile.json`
  - `output/audit/AUDIT_2026-03-05/logs/admin-flow/flow-18-db-status-after-archive.json`

### S1 — `admin_reset_user_password` RPC runtime failure
- Impact: Admin reset password flow is broken.
- Expected: reset RPC returns 204/200 and old password invalidates.
- Actual: RPC returns HTTP 404 with Postgres error `42883` (`function pg_catalog.coalesce(text, unknown) does not exist`).
- Likely root cause: invalid schema-qualification of `coalesce` in function body.
- Code reference:
  - [20260305003000_admin_capability_matrix.sql](/home/hrms_admin/projects/flchrms/supabase/migrations/20260305003000_admin_capability_matrix.sql:587)
- Evidence:
  - `output/audit/AUDIT_2026-03-05/logs/admin-flow/flow-14-reset-password.json`
  - `output/audit/AUDIT_2026-03-05/logs/admin-flow/flow-15-login-old-password.json`
  - `output/audit/AUDIT_2026-03-05/logs/admin-flow/flow-16-login-new-password.json`

### S3 — UI automation coverage gap in this runtime
- Impact: Could not execute browser UI assertions in this shell runtime.
- Actual: Playwright Chromium launch fails due missing ALSA symbol; no system browser available.
- Evidence:
  - `output/audit/AUDIT_2026-03-05/logs/admin-flow/ui-coverage-gap.json`
  - `output/audit/AUDIT_2026-03-05/logs/admin-flow/ui-script-attempt.cjs`

## Pass/Fail Matrix
- Admin auth + capability preflight: **PASS**
- Create employee (with optional fields): **FAIL**
- Create employee (minimal payload): **PASS**
- Duplicate-email validation: **PASS**
- Read/list employee (DB integrity): **PASS**
- Update employee profile (non-username): **FAIL**
- Reset employee password: **FAIL**
- Archive employee (status terminated): **FAIL**
- Restore employee: **PARTIAL PASS** (no-op style success while already active)
- Direct admin hard-delete profile boundary: **PASS** (no rows deleted; expected boundary)
- Canary cleanup (hard delete + cascade checks): **PASS**
- Actor account postcheck (`jamri.saidi`) unaffected: **PASS**

## Coverage Gaps
- UI-level click-path assertions and visual/console network traces were not executable in this environment due browser runtime dependency issue (documented above).

## Recommended Fix Plan
1. Align admin profile update scope with capability model for admin employee management actions.
- Option A: allow specific fields (`status`, `phone`, `job_title`, `department_id`, `manager_id`, `hire_date`) when `admin_has_capability(..., 'manage_employee_directory')`.
- Option B: make `admin_create_employee` patch step run as privileged backend context not subject to actor-limited trigger semantics, while preserving explicit field allowlist.
2. Fix `admin_reset_user_password` function.
- Replace `pg_catalog.coalesce(_new_password, '')` with `coalesce(_new_password, '')`.
3. Add regression tests.
- admin create with optional fields
- admin update profile status + archive/restore
- admin reset password happy path and old-password invalidation
4. Re-run this audit after patch deployment and include UI evidence from a browser-capable runner.

## Evidence Index
- Full run logs directory: `output/audit/AUDIT_2026-03-05/logs/admin-flow`
- Rollup: `output/audit/AUDIT_2026-03-05/logs/admin-flow/flow-rollup.json`
