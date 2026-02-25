# Admin Module Architecture (Phase 6)

This document describes the current `HR Admin` page structure after the Phase 6 refactor.

## Goals

- Keep `src/pages/Admin.tsx` as a thin orchestration layer.
- Separate domain actions/state from presentational components.
- Centralize permission logic to reduce RBAC drift.
- Make future tab/dialog changes lower risk.

## Current Structure

### Page Orchestration

- `src/pages/Admin.tsx`
  - wires data queries (`employees`, `departments`, `userRoles`, `leaveTypes`)
  - applies admin capability gating
  - composes tab sections and dialogs
  - passes handlers/state from domain hooks into UI components

### Domain Hooks (state + actions)

- `src/hooks/admin/useAdminPageViewModel.ts`
  - filter state (`search`, `status`, `department`)
  - deferred search filtering for employee/department lists
  - role lookup map (`getUserRole`)
  - dashboard stats counts
  - default admin tab selection

- `src/hooks/admin/useAdminEmployeeManagement.ts`
  - profile edit dialog state
  - role edit dialog state
  - password reset dialog state
  - profile/role/password actions
  - archive/restore actions

- `src/hooks/admin/useAdminDepartmentManagement.ts`
  - create/edit/delete department dialog state
  - department CRUD handlers

- `src/hooks/admin/useAdminLeaveTypeManagement.ts`
  - create/edit/delete leave type dialog state
  - leave type CRUD handlers

### Tab Sections (presentational)

- `src/components/admin/EmployeesTabSection.tsx`
- `src/components/admin/DepartmentsTabSection.tsx`
- `src/components/admin/RolesTabSection.tsx`
- `src/components/admin/LeavePoliciesSection.tsx`
- `src/components/admin/LeaveWorkflowBuildersSection.tsx`

### Dialog Components (presentational)

- `src/components/admin/AdminAccountDialogs.tsx`
- `src/components/admin/AdminDepartmentDialogs.tsx`
- `src/components/admin/AdminLeaveTypeDialogs.tsx`

### Page Shell Components

- `src/components/admin/AdminPageHeader.tsx`
- `src/components/admin/AdminStatsCards.tsx`
- `src/components/admin/AdminTabsShell.tsx`

## Permissions

- Admin page capabilities:
  - `src/lib/admin-permissions.ts`
- App-wide role checks (cross-module):
  - `src/lib/permissions.ts`

Use `src/lib/permissions.ts` for shared role checks across modules (`Dashboard`, `Leave`, `Payroll`, `Documents`, `Calendar`, etc.).
Use `src/lib/admin-permissions.ts` for the Admin page’s capability matrix.

## Shared Admin Types/Constants

- Form state types:
  - `src/components/admin/admin-form-types.ts`
- Admin UI constants:
  - `src/components/admin/admin-ui-constants.ts`

## Refactor Guidance

- Prefer adding new Admin feature behavior to a domain hook first, then pass props into section/dialog components.
- Avoid reintroducing direct role checks in page/components when a named helper can live in `src/lib/permissions.ts`.
- Keep `Admin.tsx` focused on composition; avoid embedding large dialog JSX or mutation logic back into the page.
