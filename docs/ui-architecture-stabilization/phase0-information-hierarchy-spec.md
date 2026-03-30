# Phase 0 Information Hierarchy Spec

This document turns the March 2026 UI/UX audit into an implementation-ready information hierarchy and page-architecture contract.

Phase 0 remains a design/specification phase:
- no business logic changes
- no RBAC changes
- no API/schema changes
- no workflow behavior changes

The goal is to define how the product should organize attention, navigation, and page structure before further UI implementation work begins.

## Problem Statement

The application now has a solid shared component and layout foundation, but the current route system still overuses a single structural recipe:

- header
- meta chips
- summary rail
- controls
- main content

That recipe is too generic for the actual route types in the product. Inbox routes, queue workspaces, dashboards, directories, and governance workspaces do not have the same hierarchy needs.

The audit identified four system-level issues:

1. Summary-first composition is overused even on task-first routes.
2. Mobile information architecture is still route-driven and depends too heavily on overflow navigation.
3. Governance workspaces still ask users to parse too many workspace choices before they can begin work.
4. Loading and transition states still interrupt continuity more than necessary.

## Design Intent

The application should feel like one coherent product system in which:

- route type determines page structure
- the top task appears in the first viewport
- navigation favors recognition over recall
- secondary information supports work rather than competing with it
- mobile layouts reprioritize work instead of stacking desktop composition unchanged

## Constraints

- Preserve current auth, RBAC, routing ownership, Supabase queries, and seeded test users.
- Reuse existing shared layouts and system primitives before introducing new local patterns.
- Keep the scope on information hierarchy, layout structure, navigation clarity, and perceived performance.
- Avoid visual redesign for its own sake. This phase is structural, not brand-led.
- All implementation phases must validate both desktop and mobile behavior on affected routes.

## Non-Goals

- New HR features
- New data models or schema changes
- Workflow-rule changes
- New roles or permissions
- A full visual rebrand

## Route Archetypes

The product should no longer treat every route as the same kind of page. Future UI work should map each route to one of the following archetypes.

### 1. Task Dashboard

Purpose:
- orient the user
- surface the top 1-3 actions or exceptions
- provide lightweight operational context

Structure:
1. page header
2. role/scope meta
3. urgent actions or exceptions
4. operational scan
5. supporting reference content

Rules:
- no summary rail above critical actions if there is urgent work
- customization controls are secondary utilities, not first-view anchors
- mobile first viewport must contain the top task or exception

Primary routes:
- `Dashboard`
- `Admin Dashboard`

### 2. Inbox

Purpose:
- let the user read, triage, and open related work quickly

Structure:
1. page header
2. lightweight status strip or compact summary
3. filters
4. inbox/feed
5. maintenance/settings

Rules:
- feed must visually outrank filters and maintenance controls
- summary items must be compact and informational, not dominant
- maintenance tools should be collapsed or demoted by default

Primary routes:
- `Notifications`

### 3. Queue Workspace

Purpose:
- manage active items requiring review, progress tracking, or decision-making

Structure:
1. page header
2. queue-specific primary action
3. compact queue metrics
4. queue view switcher
5. queue filters
6. queue list/table
7. supporting context or reference aside

Rules:
- the queue comes before reference information
- view switching and filtering must be visually distinct
- supporting context may sit adjacent on desktop, but must trail the queue on mobile

Primary routes:
- `Leave`

### 4. Directory / Operational List

Purpose:
- search, filter, compare, and open records efficiently

Structure:
1. page header
2. primary CTA
3. controls toolbar
4. optional summary strip
5. table or card list
6. pagination or selection utilities

Rules:
- controls outrank summary
- row identity outranks badges and metadata
- action language should be consistent across list surfaces

Primary routes:
- `Employees`
- `Departments`
- `Payroll` management surfaces

### 5. Governance Workspace

Purpose:
- let admins enter a chosen operational area, understand its mode, and act inside it

Structure:
1. page header
2. mode/scope meta
3. workspace selector
4. current workspace callout
5. active workspace content
6. secondary analytics or audit context

Rules:
- workspace selection outranks summary rail metrics
- long horizontal tabs should be avoided when they become the main IA burden
- analytics and audit surfaces should not compete with the active management surface

Primary routes:
- `Admin Leave Policies`
- future dense governance consoles

## Global Hierarchy Rules

### Summary Usage

Summary rails are optional.

Use them when:
- the page is reference-heavy
- the metrics are required to frame the work

Do not use them when:
- the page is primarily a queue or feed
- the first job is obvious and operational
- the metrics delay the start of work

### Header Contract

Every route should preserve:
- eyebrow when needed
- single page `h1`
- one clear description line
- primary actions grouped in the header action area
- meta chips only when they clarify scope, mode, or role

### CTA Taxonomy

Use action labels by intent:
- `Open` for navigating to a record or workspace
- `View` for reference surfaces or read-only detail
- `Manage` for operational control surfaces
- `Review` for decision queues
- `Request` for initiation flows
- `Download` for exported artifacts

Avoid mixing synonyms for the same action type on adjacent surfaces.

### Mobile Priority Rules

For mobile:
- first viewport must contain the top task, not just page framing
- summary content should be compressed into chips or a compact rail
- reference surfaces should trail task surfaces
- overflow navigation should not hide the most likely next destination for the current role

### Loading / Transition Rules

Route transitions should preserve the shell whenever possible.

Preferred pattern:
- persistent shell
- page-level skeletons or placeholder surfaces inside the content area
- avoid full-page blockers after auth is established

## Navigation Contract

### Desktop

- Sidebar grouping remains valid: `Work`, `People`, `Records`, `Planning`, `Governance`
- Labels must remain concrete and task-readable
- Route group labels are supportive, not dominant visual elements

### Mobile

Mobile navigation should be role-journey aware, not only route-count aware.

Rules:
- prioritize the four most likely destinations for the signed-in role
- reduce dependence on `More` for common daily flows
- keep navigation naming consistent with desktop
- avoid separate mental models for employee vs governance mobile entry

## Route Mapping

| Route | Archetype | Current Risk |
|---|---|---|
| `/dashboard` | Task Dashboard | Still card-heavy, especially on admin/mobile |
| `/notifications` | Inbox | Feed still competes with summary/filter weight on mobile |
| `/leave` | Queue Workspace | Strongest current queue model; keep refining, do not regress |
| `/attendance` | Task Dashboard | Good task-first structure; low risk |
| `/payroll` | Directory / Operational List | Employee vs admin experiences should stay clearly separated |
| `/employees` | Directory / Operational List | Strong base, but metadata/action language can improve |
| `/admin/dashboard` | Task Dashboard | Good structure, but summary and analytics can still dominate |
| `/admin/leave-policies` | Governance Workspace | Current horizontal tab model is still cognitively heavy |

## Acceptance Criteria

Phase 0 is complete when:

1. Every primary route is assigned to one archetype.
2. Each archetype has an agreed content order and mobile rule set.
3. Summary rails are explicitly classified as required, optional, or disallowed by route type.
4. Mobile navigation rules are defined by role journey and destination priority.
5. The first implementation sprint can proceed without reopening IA questions.

## Validation Model for Implementation Phases

Every implementation sprint should validate:
- desktop browser pass on affected routes
- mobile browser pass on affected routes
- `npm run build`
- targeted tests for touched pages/components
- confirmation that no business behavior changed

## Phase Sequencing

Recommended delivery order:

1. Shell and navigation rationalization
2. Route-archetype layout layer
3. High-impact page conversions:
   - `Dashboard`
   - `Notifications`
   - `Admin Leave Policies`
   - `Admin Dashboard`
4. Secondary route cleanup:
   - `Employees`
   - `Payroll`
   - `Attendance`
   - `Leave`
5. Perceived-performance and transition-state cleanup

## Sprint 1 Handoff

Sprint 1 should implement the shell and navigation rationalization layer:
- mobile primary navigation
- desktop/sidebar clarity refinements
- governance/app navigation continuity
- foundational support for route-archetype-aware first-view priority
