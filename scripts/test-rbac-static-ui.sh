#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

echo "Running static RBAC UI smoke checks..."

# App route guards are constant-driven
rg -q "AUTHENTICATED_APP_ROLES" src/App.tsx
rg -q "EMPLOYEE_DIRECTORY_ALLOWED_ROLES" src/App.tsx
rg -q "DOCUMENT_MANAGER_ROLES" src/App.tsx
rg -q "PERFORMANCE_REVIEW_CONDUCTOR_ROLES" src/App.tsx
rg -q "MANAGER_AND_ABOVE_ROLES" src/App.tsx
rg -q "<ProtectedRoute allowedRoles=\\{AUTHENTICATED_APP_ROLES\\}" src/App.tsx
rg -q "<ProtectedRoute allowedRoles=\\{EMPLOYEE_DIRECTORY_ALLOWED_ROLES\\}" src/App.tsx
rg -q "<ProtectedRoute allowedRoles=\\{DOCUMENT_MANAGER_ROLES\\}" src/App.tsx
rg -q "<ProtectedRoute allowedRoles=\\{PERFORMANCE_REVIEW_CONDUCTOR_ROLES\\}" src/App.tsx
rg -q "<ProtectedRoute allowedRoles=\\{MANAGER_AND_ABOVE_ROLES\\}" src/App.tsx

# Sidebar uses permission helpers/constants (no inline literal role chains)
rg -q "useMyAdminCapabilities" src/components/layout/AppSidebar.tsx
rg -q "capabilityMap.access_admin_console" src/components/layout/AppSidebar.tsx
rg -q "hasRole\\(role, MANAGER_AND_ABOVE_ROLES\\)" src/components/layout/AppSidebar.tsx
rg -q "hasRole\\(role, DOCUMENT_MANAGER_ROLES\\)" src/components/layout/AppSidebar.tsx
rg -q "hasRole\\(role, PERFORMANCE_REVIEW_CONDUCTOR_ROLES\\)" src/components/layout/AppSidebar.tsx

# Permission checks in pages are helper-driven
rg -q "canManageDocuments as canManageDocumentsPermission" src/pages/Documents.tsx
rg -q "const canManageDocuments = canManageDocumentsPermission\\(role\\);" src/pages/Documents.tsx
rg -q "canManageHolidays as canManageHolidaysPermission" src/pages/TeamCalendar.tsx
rg -q "canManageDepartmentEvents as canManageDepartmentEventsPermission" src/pages/TeamCalendar.tsx
rg -q "canViewCalendarLeaveTypeLabel" src/pages/TeamCalendar.tsx

# Admin capabilities are centralized in helper
rg -q "isAdminLimitedProfileEditor: false" src/lib/admin-permissions.ts
rg -q "canOpenAccountProfileEditor: canManageEmployeeProfiles" src/lib/admin-permissions.ts

# Leave action/details strings now live in module-owned drawer surfaces
rg -q "Approve Cancel" src/components/leave/TeamLeaveRequestsTable.tsx
rg -q "Reject Cancel" src/components/leave/TeamLeaveRequestsTable.tsx
rg -q "LeaveDetailDrawer" src/modules/leave/LeavePage.tsx
rg -q 'title=\"Approval History\"' src/modules/leave/components/LeaveDrawer/tabs/ApprovalHistoryTab.tsx
rg -q 'title=\"Cancellation History\"' src/modules/leave/components/LeaveDrawer/tabs/CancellationHistoryTab.tsx

# Workflow builder content moved out of legacy Admin page
test ! -f src/pages/Admin.tsx
rg -q "Leave Cancellation Workflow Builder" src/components/admin/LeaveWorkflowBuildersSection.tsx
rg -q "useLeaveCancellationWorkflows" src/components/admin/LeaveWorkflowBuildersSection.tsx
rg -q "Department Scope" src/components/admin/DepartmentWorkflowBuilderCard.tsx
rg -q "All Departments \\(Default\\)" src/components/admin/DepartmentWorkflowBuilderCard.tsx
! rg -q "Workflow Profile \\(Requester Role\\)" src/components/admin/LeaveWorkflowBuildersSection.tsx
! rg -q "Save As Profile \\(Copy To Role\\)" src/components/admin/LeaveWorkflowBuildersSection.tsx

# Legacy literals should not exist in current architecture
! rg -q "allowedRoles=\\{\\['admin', 'hr', 'director'\\]\\}" src/App.tsx
! rg -q "role === 'admin' \\|\\| role === 'hr' \\|\\| role === 'director'" src/components/layout/AppSidebar.tsx
! rg -q "const canManageDocuments = role === 'hr' \\|\\| role === 'director'" src/pages/Documents.tsx
! rg -q "const canManageHolidays = role === 'hr' \\|\\| role === 'director'" src/pages/TeamCalendar.tsx

echo "Static RBAC UI smoke checks passed."
