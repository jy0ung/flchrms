# RBAC Playwright Matrix (Phase 3)

This is the target E2E matrix for the next phase after installing Playwright.

## Roles

- `employee`
- `manager`
- `general_manager`
- `director`
- `hr`
- `admin`

## Priority Flows

1. `director` can open `/admin` and see HR Admin sidebar link.
2. `admin` can open `/admin` and defaults to `Role Management` tab.
3. `admin` can open profile/account dialog for an employee but only sees username alias controls.
4. `admin` can reset employee password from HR Admin.
5. `admin` cannot approve/reject leave requests in Leave Management.
6. `admin` cannot open other users' leave attachment actions in team requests.
7. `hr` can manage leave types and workflow profiles.
8. `director` can manage leave types and workflow profiles.
9. `hr` and `director` can manage payroll tabs; `admin` only sees payslips tab.
10. `director` can manage documents; `admin` cannot upload/delete employee documents.
11. `director` can create holidays in Team Calendar; `admin` cannot.
12. `manager`/`general_manager`/`director` approval path respects leave workflow stages for visible actions.
13. `employee` can request cancellation for a final-approved leave request (reason required).
14. `manager`/`general_manager`/`director` cancellation approval path respects configured cancellation workflow stages.
15. `hr`/`admin` can view leave details timeline but cannot approve/reject cancellation requests.
16. `manager`/`general_manager`/`director` can open leave details and see approval + cancellation timeline events.

## Test Data Prerequisites

- At least one user for each role
- One employee with:
  - a leave request with attachment
  - a profile username alias
  - salary structure + payslip
- Department hierarchy allowing manager/GM scoping
- At least one training enrollment and one performance review row

## Suggested Spec Split

- `e2e/rbac-admin-director-access.spec.ts`
- `e2e/rbac-leave-approvals.spec.ts`
- `e2e/rbac-leave-cancellations.spec.ts`
- `e2e/rbac-payroll-documents-calendar.spec.ts`

## Implemented Phase 3B Specs (current)

- `e2e/rbac-admin-director-access.spec.ts`
  - director access to `/admin` + workflow builders
  - admin default `Role Management` tab
  - admin account-limited profile dialog (username alias only)
- `e2e/rbac-leave-cancellations.spec.ts`
  - employee cancellation request
  - manager cancellation actions + details timeline
  - HR details-view-only
- `e2e/rbac-calendar-visibility.spec.ts`
  - employee calendar leave visibility without leave type label
  - manager calendar leave visibility with leave type label
