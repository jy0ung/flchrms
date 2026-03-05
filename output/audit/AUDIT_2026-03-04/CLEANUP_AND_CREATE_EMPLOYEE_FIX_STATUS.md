# Production Cleanup + Create Employee Fix Status — AUDIT_2026-03-04

## Completed

1. Targeted production test-data cleanup executed with hard guard checks.
2. Candidate set was locked to:
   - `deleted_at IS NULL`
   - `lower(email) LIKE '%@flchrms.test'`
   - `created_at` between `2026-03-04 12:41:58+00` and `2026-03-04 12:42:47.999999+00`
3. Guard check passed with exactly `28` candidates.
4. No non-cascade FK blockers were present for the candidate set.
5. Hard delete on `auth.users` completed for all 28 candidates.
6. Post-check confirmed:
   - active users = `5`
   - active `.test` users = `0`
   - non-test active users = `5`
   - no remaining `.test` rows in `profiles`, `user_roles`, `attendance`, `leave_requests`, `leave_request_events`, `employee_lifecycle_events`, `user_notification_preferences`.

## Create Employee Fixes Applied

### Migration files added
- `supabase/migrations/20260305000000_admin_create_employee_allow_admin.sql`
- `supabase/migrations/20260305001000_admin_create_employee_fix_validation.sql`
- `supabase/migrations/20260305002000_admin_create_employee_fix_trim.sql`

### Why three migrations
- The first migration implemented the intended RBAC change (allow `admin`).
- Live validation exposed existing runtime defects in the original function body:
  - schema-qualified `coalesce` usage
  - schema-qualified `trim` usage
- Two follow-up migrations corrected those runtime issues while keeping the same function signature and access model.

### Final live function behavior
- `admin_create_employee` allows `admin`, `hr`, and `director`.
- Validation logic executes correctly (no runtime function-resolution errors).

## Live Validation Evidence

1. Admin auth + RPC validation was executed with account:
   - email: `flit092023@gmail.com` (username alias `jamri.saidi`)
2. RPC call returned a new user UUID successfully.
3. Validation-created user was immediately deleted from `auth.users`.
4. Post-check confirmed zero remaining rows for the validation email.

## Repo Updates

1. Integration test contract updated:
   - `src/test/integration/admin.integration.test.ts`
   - admin success added
   - hr/director success added
   - manager/general_manager negative cases added
2. Documentation updated:
   - `docs/specs/01-product-functional-spec.md`
   - `docs/specs/03-data-security-spec.md`

## Evidence Files

### Pre-cleanup snapshots
- `output/audit/AUDIT_2026-03-04/logs/cleanup-preflight-candidates.json`
- `output/audit/AUDIT_2026-03-04/logs/cleanup-preflight-candidate-count.json`
- `output/audit/AUDIT_2026-03-04/logs/cleanup-preflight-auth-users.json`
- `output/audit/AUDIT_2026-03-04/logs/cleanup-preflight-profiles.json`
- `output/audit/AUDIT_2026-03-04/logs/cleanup-preflight-user-roles.json`
- `output/audit/AUDIT_2026-03-04/logs/cleanup-preflight-leave-requests.json`
- `output/audit/AUDIT_2026-03-04/logs/cleanup-preflight-leave-request-events.json`
- `output/audit/AUDIT_2026-03-04/logs/cleanup-preflight-attendance.json`
- `output/audit/AUDIT_2026-03-04/logs/cleanup-preflight-employee-lifecycle-events.json`
- `output/audit/AUDIT_2026-03-04/logs/cleanup-preflight-user-notification-preferences.json`

### Cleanup execution and post-check
- `output/audit/AUDIT_2026-03-04/logs/cleanup-delete-response.json`
- `output/audit/AUDIT_2026-03-04/logs/cleanup-postcheck-user-counts.json`
- `output/audit/AUDIT_2026-03-04/logs/cleanup-postcheck-candidate-count.json`
- `output/audit/AUDIT_2026-03-04/logs/cleanup-postcheck-profiles-remaining.json`
- `output/audit/AUDIT_2026-03-04/logs/cleanup-postcheck-dependent-counts.json`

### Migration apply/verify
- `output/audit/AUDIT_2026-03-04/logs/migration-20260305000000-apply-response.json`
- `output/audit/AUDIT_2026-03-04/logs/migration-20260305000000-verify-function.json`
- `output/audit/AUDIT_2026-03-04/logs/migration-20260305001000-apply-response.json`
- `output/audit/AUDIT_2026-03-04/logs/migration-20260305001000-verify-function.json`
- `output/audit/AUDIT_2026-03-04/logs/migration-20260305002000-apply-response.json`
- `output/audit/AUDIT_2026-03-04/logs/migration-20260305002000-verify-function.json`

### Live RPC validation
- `output/audit/AUDIT_2026-03-04/logs/admin-create-validate-auth-3.json`
- `output/audit/AUDIT_2026-03-04/logs/admin-create-validate-rpc-3.json`
- `output/audit/AUDIT_2026-03-04/logs/admin-create-validate-cleanup-3.json`
- `output/audit/AUDIT_2026-03-04/logs/admin-create-validate-postcheck-3.json`

## Security Note

The management token used during this run was shared in-chat. Rotate it immediately after this operation window.
