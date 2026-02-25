#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

echo "Running static RBAC UI smoke checks..."

rg -q "allowedRoles=\\{\\['admin', 'hr', 'director'\\]\\}" src/App.tsx
rg -q "\\(role === 'admin' \\|\\| role === 'hr' \\|\\| role === 'director'\\)" src/components/layout/AppSidebar.tsx
rg -q "const canManageDocuments = role === 'hr' \\|\\| role === 'director';" src/pages/Documents.tsx
rg -q "const canManageHolidays = role === 'hr' \\|\\| role === 'director';" src/pages/TeamCalendar.tsx
rg -q "const canManageDepartmentEvents =" src/pages/TeamCalendar.tsx
rg -q "role === 'general_manager'" src/components/dashboard/DashboardCharts.tsx
rg -q "role === 'director'" src/components/dashboard/DashboardCharts.tsx
rg -q "const canOpenAccountProfileEditor = canManageEmployeeProfiles \\|\\| role === 'admin';" src/pages/Admin.tsx
rg -q "const isAdminLimitedProfileEditor = role === 'admin';" src/pages/Admin.tsx
rg -q "request\\.document_url && role !== 'admin'" src/pages/Leave.tsx
rg -q "Leave Cancellation Workflow Builder" src/pages/Admin.tsx
rg -q "useLeaveCancellationWorkflows" src/pages/Admin.tsx
rg -q "Department Scope" src/pages/Admin.tsx
rg -q "All Departments \\(Default\\)" src/pages/Admin.tsx
! rg -q "Workflow Profile \\(Requester Role\\)" src/pages/Admin.tsx
! rg -q "Save As Profile \\(Copy To Role\\)" src/pages/Admin.tsx
rg -q "Approve Cancel" src/pages/Leave.tsx
rg -q "Reject Cancel" src/pages/Leave.tsx
rg -q "Leave Request Details" src/pages/Leave.tsx
rg -q "Approval Timeline" src/pages/Leave.tsx
rg -q "Cancellation Timeline" src/pages/Leave.tsx

echo "Static RBAC UI smoke checks passed."
