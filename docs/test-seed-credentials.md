# Targeted Test Seed Credentials (Local/Dev Only)

This project includes a local/dev seed for role-based testing and Phase 3B E2E flows.

- Seed SQL: `supabase/seeds/targeted_test_seed.sql`
- Apply wrapper: `scripts/seed-targeted-test-data.sh`

## Safety

- These are predictable credentials.
- Use only in local/dev environments.
- Do not apply this seed to staging/production.

## Apply The Seed

```bash
npm run seed:test:targeted
```

Optional container override:

```bash
SUPABASE_DB_CONTAINER=supabase-db npm run seed:test:targeted
```

## Default Password

All seeded test users use the same password:

```text
Test1234!
```

## Seeded Test Accounts (All Levels)

| Role | Name | Email | Username | Employee ID |
|---|---|---|---|---|
| admin | System Admin | `admin@flchrms.test` | `admin.test` | `TST-ADM-001` |
| hr | Hannah HR | `hr@flchrms.test` | `hr.test` | `TST-HR-001` |
| director | Diana Director | `director@flchrms.test` | `director.test` | `TST-DIR-001` |
| general_manager | Gavin GM | `gm@flchrms.test` | `gm.test` | `TST-GM-001` |
| manager | Mason Manager | `manager@flchrms.test` | `manager.test` | `TST-MGR-001` |
| employee | Evelyn Employee | `employee@flchrms.test` | `employee.test` | `TST-EMP-001` |

## What The Seed Includes (Targeted Module Fixtures)

- Departments (`Operations`, `People Operations`)
- Department-based leave approval workflows (global + Operations override)
- Department-based leave cancellation workflows (global + Operations override)
- Leave requests for:
  - final approved (for cancellation request testing)
  - final approved with pending cancellation
  - pending approval
  - manager self-leave (route adaptation check)
- Holidays and department event
- Announcement
- Attendance records
- Training program + enrollment
- Performance review
- Payroll sample (salary structure, payroll period, payslip, deduction)
- Document metadata row (for Documents module visibility checks)

## E2E Setup (Phase 3B)

```bash
cp .env.e2e.test-seed.example .env.e2e.test-seed
set -a; source .env.e2e.test-seed; set +a
npm run test:rbac:e2e:phase3b
```

Notes:
- The Phase 3B calendar visibility spec may skip if no leave event is found in the current month view.
- You can override `E2E_PHASE3B_TARGET_LEAVE_ROW_TEXT` to target a different seeded row label.

## Re-run / Reset

- The seed is designed to be idempotent for seeded fixture rows and seeded users.
- It may replace seeded workflow rows for:
  - global default scope
  - seeded `Operations` / `People Operations` department scopes

If you want a full local wipe first, reset your Supabase Docker volumes and then reapply migrations + this seed.
