# Admin Shell Architecture

This document describes the current admin shell after the contextual workspace migration and Phase 8 cleanup.

## Current Role of Admin

The admin shell is no longer the primary CRUD surface for employees or departments.

It now focuses on:

- governance
- role management
- leave policy configuration
- audit visibility
- announcements
- system settings
- routing operators into canonical module workspaces

## Canonical Operational Workspaces

Operational record work now belongs in module-owned pages:

- employees: `src/modules/employees/EmployeesPage.tsx`
- departments: `src/modules/departments/DepartmentsPage.tsx`
- leave: `src/modules/leave/LeavePage.tsx`

Admin compatibility routes still exist for bookmarked or wrapper-specific entry paths:

- `src/pages/admin/AdminEmployeesPage.tsx`
- `src/pages/admin/AdminDepartmentsPage.tsx`

Those routes are thin bridges over the canonical module pages.

## Admin Shell Pages

- `src/pages/admin/AdminDashboardPage.tsx`
  - governance-oriented dashboard and analytics

- `src/pages/admin/AdminQuickActionsPage.tsx`
  - routing hub into canonical workspaces and remaining admin controls

- `src/pages/admin/AdminRolesPage.tsx`
  - role assignment and capability management

- `src/pages/admin/AdminLeavePoliciesPage.tsx`
  - leave types, workflows, and policy configuration

- `src/pages/admin/AdminAnnouncementsPage.tsx`
  - announcement management

- `src/pages/admin/AdminAuditLogPage.tsx`
  - audit and change visibility

- `src/pages/admin/AdminSettingsPage.tsx`
  - admin-level platform settings

## Compatibility Bridge Layer

Shared bridge metadata and presentation are centralized in:

- `src/components/admin/admin-workspace-bridges.ts`
- `src/components/admin/AdminWorkspaceBridge.tsx`
- `src/components/workspace/WorkspaceTransitionNotice.tsx`

This keeps the employee and department compatibility routes aligned with the same copy, destination, and action labeling used by admin quick actions.

## Domain Hooks Still Owned by Admin

- `src/hooks/admin/useAdminCapabilities.ts`
  - capability loading and page-level gating

- `src/hooks/admin/useAdminEmployeeManagement.ts`
  - retained for role-management flows that still need employee account dialogs

- `src/hooks/admin/useAdminLeaveTypeManagement.ts`
  - leave-type CRUD orchestration for leave policy pages

- `src/hooks/admin/useAdminPageViewModel.ts`
  - role page filtering and derived admin view state

## Reused Dialog Components

Some admin-era dialogs remain valid and are reused by canonical modules:

- `src/components/admin/AdminAccountDialogs.tsx`
- `src/components/admin/CreateEmployeeDialog.tsx`
- `src/components/admin/BatchUpdateDialog.tsx`
- `src/components/admin/AdminDepartmentDialogs.tsx`
- `src/components/admin/AdminLeaveTypeDialogs.tsx`

These are not dead code. They remain part of the active UI surface through module-owned wrappers.

## Permissions

- admin capability matrix:
  - `src/lib/admin-capabilities.ts`
  - `src/hooks/admin/useAdminCapabilities.ts`

- app-wide role and workflow rules:
  - `src/lib/permissions.ts`
  - `src/lib/admin-permissions.ts`

Use shared permission helpers instead of embedding new role checks directly in admin pages.

## Cleanup Notes

The following centralized-admin artifacts have been removed because the app no longer routes through them:

- employee and department admin tab sections
- obsolete compatibility wrappers around canonical module pages
- the old leave request details modal path replaced by module drawers

## Guidance

- Keep admin pages thin and capability-gated.
- Prefer sending users into canonical modules for operational work.
- Add shared admin routing or governance behavior to the bridge/config layer first when it applies to more than one page.
- Do not reintroduce centralized CRUD ownership into the admin shell.
