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

## Shell Architecture: Why AdminLayout?

The application uses two separate shell layouts: **AppLayout** (main app shell) and **AdminLayout** (governance shell).

### Design Rationale

**Separation of concerns:**
- `AppLayout` serves operational modules: leave, payroll, employees (canonical), attendance, etc.
- `AdminLayout` serves governance and system-level features: roles, policies, audit, announcements, settings.

The two shells have different visual hierarchies:
- `AppLayout`: Emphasizes module-level navigation with sidebar menu for operational routes.
- `AdminLayout`: Emphasizes capability-gated admin sidebar with governance-focused navigation.

**Why not one unified shell?**
1. **Navigation complexity**: Unifying them would require complex conditional rendering in a single sidebar. Admin routes and app routes have different permission models (role-level + capability-matrix for admin, role-level only for app).
2. **Visual consistency**: Keeping them separate allows each shell to optimize its information hierarchy for its audience (operators vs. administrators).
3. **Scope clarity**: Team members can clearly understand whether a feature belongs in the operational workspace or the governance workspace.

### When to Use AdminLayout vs. AppLayout

**Use `AdminLayout` if:**
- The page is gated by admin capabilities (e.g., role management, audit logs, policy settings).
- The page serves governance, compliance, or system configuration functions.
- The page is accessed via `/admin/*` routes.
- The feature is only relevant for administrators or select high-privilege roles.

**Use `AppLayout` if:**
- The page serves operational workflows (e.g., leave requests, payroll review, employee directory).
- The page is gated by role-level permissions (not capability checks).
- The page is accessed via module routes like `/leave/*`, `/payroll/*`, `/employees/*`.
- Multiple roles need access (not just admins).

### New Page Checklist

When adding a new page, ask:

1. **Is this a governance or system feature?** (audit, roles, policies, settings) → AdminLayout
2. **Is this operational work?** (leave, payroll, attendance, employees) → AppLayout
3. **Do multiple roles access this?** → AppLayout
4. **Only admins access it?** → AdminLayout
5. **Does it require capability checks?** → AdminLayout
6. **Does it use role checks only?** → Likely AppLayout

If uncertain, check whether the canonical module workspace (e.g., `LeavePage.tsx`) already exists. If yes, extend it using `AppLayout`. If no, and the feature is governance-related, create an admin page using `AdminLayout`.

## Guidance

- Keep admin pages thin and capability-gated.
- Prefer sending users into canonical modules for operational work.
- Add shared admin routing or governance behavior to the bridge/config layer first when it applies to more than one page.
- Do not reintroduce centralized CRUD ownership into the admin shell.
- Use role-based permission helpers in navigation to prevent unmapped admin shortcuts.
