# UX Remediation Sprint Plan

This document turns the remaining UX remediation backlog into sprint-sized implementation slices.

## Constraints

- Stay inside the current product scope. No new HR features are introduced as part of these sprints.
- Preserve existing auth, RBAC, routing, Supabase queries, and seeded test profiles unless a UX fix cannot be delivered without a small supporting change.
- Favor shared UI primitives and route templates over one-off page styling.
- Each sprint must ship with targeted tests, a successful app build, and browser verification on the affected routes.
- Employee-facing flows remain first priority. Governance/admin changes follow after the employee workspace patterns are stable.

## Scope

In scope:
- Information hierarchy
- Layout placement and spacing
- Consistency of page structure and interaction patterns
- Mobile prioritization on the most-used routes
- Table and card scanning improvements where decoration currently outranks content

Out of scope:
- New data models or large backend changes
- New roles, permissions, or workflow policy behavior
- Feature expansion beyond the audited modules

## Modules Affected

- `Leave`
- `Attendance`
- `Payroll`
- `Admin Dashboard`
- `Admin Leave Policies`
- Shared table, chip, and mobile prioritization patterns used across employee and governance routes

## Sprint Sequence

### Sprint 1: Leave Workspace Clarity

Status: `In progress`

Goals:
- Make the leave queue the primary workspace on employee and reviewer views
- Separate queue navigation from queue filters
- Demote balance/reference content so it supports the task instead of competing with it
- Improve mobile priority order for the leave route

Routes and modules:
- `src/modules/leave/LeavePage.tsx`
- `src/components/leave/LeaveRequestWorkspace.tsx`
- Supporting leave table and summary components as needed

Acceptance criteria:
- The request or approval queue appears before secondary reference content on smaller screens
- View switching and status filtering read as separate controls
- Balance/reference content is still available but visually secondary
- Leave route tests, build, and browser QA pass

### Sprint 2: Attendance and Payroll Task Focus

Status: `Planned`

Goals:
- Reframe attendance around the daily timekeeping action
- Reduce low-value empty-state chrome in payroll
- Clarify data states such as `not configured`, `no records yet`, and `zero`

Routes and modules:
- `src/pages/Attendance.tsx`
- `src/modules/payroll/PayrollPage.tsx`

Acceptance criteria:
- Attendance shows the primary clock action in the first viewport
- Payroll does not present misleading or over-prominent controls when data is absent
- Empty states provide a clear next step

### Sprint 3: Governance Hierarchy Harmonization

Status: `Planned`

Goals:
- Align governance/admin page hierarchy with the employee shell patterns already in place
- Reduce tab overload and improve decision-first layout ordering

Routes and modules:
- `src/pages/admin/AdminDashboardPage.tsx`
- `src/pages/admin/AdminLeavePoliciesPage.tsx`
- Supporting governance sections and tables

Acceptance criteria:
- Governance pages feel structurally aligned with the main app shell
- Alerts and actions outrank reference analytics where appropriate
- Dense policy/workflow surfaces scan more cleanly

### Sprint 4: Cross-App Density and Scanability Polish

Status: `Planned`

Goals:
- Reduce decorative chip weight where it competes with primary content
- Standardize table row emphasis and action placement
- Finish mobile prioritization cleanup on routes touched by earlier sprints

Routes and modules:
- Shared table, badge, chip, and card patterns
- Secondary employee/admin surfaces impacted by the standardization work

Acceptance criteria:
- Primary row content is easier to scan than status decoration
- Repeated action placement is consistent across tables and cards
- Mobile first-view priority is stable across touched modules

## Delivery Order

1. Leave workspace clarity
2. Attendance and payroll task focus
3. Governance hierarchy harmonization
4. Cross-app density and scanability polish

## Current Baseline

Already completed before this sprint plan:
- Shared shell and page-template remediation
- Dashboard hierarchy remediation
- Notifications feed-first remediation
