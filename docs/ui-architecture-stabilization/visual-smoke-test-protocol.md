# Visual Smoke-Test Protocol (UI Architecture Stabilization)

This protocol is required for UI refactor PRs that touch shared UI components, page shells, table layouts, modals, or dashboards.

## Objectives

- Catch visual regressions early
- Verify layout/spacing consistency after structural changes
- Preserve responsiveness and accessibility basics
- Validate high-traffic internal workflows remain readable and operable

## Required Target Pages (Phase 0 Baseline)

Always include these pages in visual smoke checks when shared UI components or layout primitives are touched:

1. Dashboard
2. Leave
3. Payroll
4. Admin (HR Admin)
5. Profile

## Breakpoint Matrix

At minimum, verify:

- Desktop: `1440x900` (or equivalent)
- Tablet: `1024x768`
- Mobile: `390x844` (or equivalent narrow portrait)

If the PR touches dense tables or dashboards, also check:
- Large desktop: `1600x900+`

## Role Matrix (Minimum)

Use seeded or staging accounts to ensure role-specific UI is visible:

- Employee (required)
- Manager or General Manager (required for dashboard/team views)
- HR or Admin (required for Admin/Payroll)

If the PR affects executive widgets or HR Admin scope:
- Director (recommended)

## Smoke-Test Procedure by Page

### 1. Dashboard
- Verify header hierarchy (title, subtitle, actions, chips)
- Verify widget grid alignment and spacing
- Verify no clipped titles/badges/buttons
- Verify edit/customize mode controls render correctly (if dashboard touched)
- Verify mobile layout stacks cleanly and remains actionable

### 2. Leave
- Verify page header and tabs
- Verify My Leave and Team Leave section/table/list rendering
- Verify at least one dialog (details or approval) if modal styles changed
- Verify status badges remain readable and consistent

### 3. Payroll
- Verify header + tabs + tab-aware header action placement
- Verify salary/payroll/deduction table card shells
- Verify payroll generation UI (button states/progress panel if visible)
- Verify Payslip Details dialog if modal styles changed

### 4. Admin (HR Admin)
- Verify admin page header and stats/tabs shell
- Verify at least one table/list section and one dialog
- Verify workflow builder/queue ops panels still align and scroll correctly

### 5. Profile
- Verify header card, identity summary card, tab bar, overview tiles
- Verify mobile stacking and spacing
- Verify notification settings section layout if touched

## Required Interaction Checks

For impacted pages only:

- hover/active states on primary actions
- tab switching
- open/close dialog
- keyboard focus ring visible on at least one interactive element
- responsive overflow/scroll behavior (especially tables/modals)

## Evidence Format (PR)

Provide one of the following:

Option A (preferred)
- screenshots per page at affected breakpoints

Option B
- explicit checklist with pass/fail notes per page and breakpoint

Include:
- browser used
- viewport(s)
- role(s) tested

## Failure Criteria (Must Fix Before Merge)

- clipped or overlapping text/buttons
- hidden/unreachable primary actions
- broken tab or toolbar layout on mobile
- modal close/action controls visually detached or inaccessible
- contrast/readability regression on primary content
- header/action layout instability in key pages

## Tooling Guidance (optional)

- Manual browser checks are acceptable
- Playwright screenshot runs are preferred when practical
- Do not commit local screenshot/debug artifacts unless intentionally added to repo docs

