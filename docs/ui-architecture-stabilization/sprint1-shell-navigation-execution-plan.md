# Sprint 1 Execution Plan: Shell and Navigation Rationalization

This sprint is the first implementation slice following the Phase 0 information hierarchy spec.

Sprint goal:
- reduce navigation friction
- improve first-view task clarity on mobile
- create a cleaner shell foundation for later page-archetype migrations

This sprint is intentionally limited to shell and navigation behavior. It should not redesign individual business workflows beyond what is necessary to make the navigation model coherent.

## Sprint Objective

Deliver one responsive navigation model that:
- reflects likely role journeys
- reduces dependence on overflow navigation for common work
- keeps employee and governance entry patterns structurally consistent
- preserves current routes, permissions, and workflows

## Scope

In scope:
- mobile bottom navigation
- mobile overflow navigation behavior
- sidebar grouping clarity and supporting labels
- governance/app transition clarity
- shell-level hierarchy adjustments required to support the new nav model

Out of scope:
- page-specific dashboard redesign
- inbox/feed restructuring
- governance workspace redesign
- business logic or RBAC changes

## Affected Files and Modules

Primary implementation seams:
- `src/components/layout/MobileBottomNav.tsx`
- `src/components/layout/mobile-role-journeys.ts`
- `src/components/layout/mobile-bottom-nav-config.ts`
- `src/components/layout/AppSidebar.tsx`

Likely supporting seams:
- shell header components if navigation affordances need alignment
- route label constants in `src/lib/navigation-labels.ts`
- any sidebar/mobile drawer wiring used by the app shell

## Problem to Solve

Current issues:

1. Mobile primary destinations are still too route-driven.
2. Important destinations can be hidden behind `More`, especially when the current role has broader scope.
3. Governance feels like a separate navigation mode rather than an extension of the same product.
4. Sidebar grouping is structurally sound, but the mobile model does not clearly inherit that logic.

## Sprint Deliverables

### 1. Mobile Journey Model Refresh

Define updated mobile primary-route sets for each role:
- `employee`
- `manager`
- `general_manager`
- `hr`
- `director`
- `admin`

Expected outcome:
- the four visible destinations should reflect the most frequent daily work for that role
- the overflow path should hold secondary routes, not core daily routes

### 2. Bottom Navigation Hierarchy Update

Rework the bottom navigation so it behaves like a task entry bar rather than a thin route mirror.

Expected outcome:
- primary destinations are recognizable at a glance
- notification presence remains visible without overpowering the nav
- active-state treatment is clear and consistent

### 3. Overflow / Sidebar Continuity

Ensure the `More` surface feels like an extension of the main nav, not a second navigation system.

Expected outcome:
- grouping in overflow mirrors desktop grouping
- users can understand where hidden routes live before scanning the full list
- governance entry and return paths remain obvious

### 4. Governance Transition Clarity

Tighten the relationship between employee shell navigation and governance navigation.

Expected outcome:
- switching into governance feels like entering a specialized workspace, not a separate product
- labels and structural cues stay consistent

## UX Acceptance Criteria

Sprint 1 is complete when:

1. The most likely daily routes for each role are available without opening `More`.
2. Mobile users can infer where secondary routes live from the overflow grouping.
3. Desktop and mobile route labels use the same naming model.
4. Governance entry does not feel disconnected from the app shell.
5. No route access or permissions change.

## Technical Acceptance Criteria

- `npm run build` passes
- targeted tests for touched navigation components pass
- desktop and mobile browser QA passes on representative roles
- no changes to Supabase queries, route guards, or role-permission logic

## Work Breakdown

### Workstream A: IA Rules and Config

Tasks:
- review current role journeys in `mobile-role-journeys.ts`
- re-rank primary mobile destinations by role
- confirm which destinations move behind overflow
- normalize route naming between bottom nav and sidebar

Output:
- updated mobile route-priority config

### Workstream B: Mobile Nav UI

Tasks:
- refine bottom-nav rendering in `MobileBottomNav.tsx`
- preserve accessible labels and notification count handling
- ensure active states remain readable at small widths
- verify tap targets remain compliant

Output:
- improved mobile primary navigation component

### Workstream C: Overflow and Desktop Alignment

Tasks:
- review `AppSidebar.tsx` grouping and labels
- align overflow ordering/grouping with desktop mental model
- refine governance grouping language if needed
- confirm app-to-governance transition language remains consistent

Output:
- aligned desktop/mobile navigation structure

### Workstream D: Validation

Tasks:
- browser pass for employee mobile shell
- browser pass for admin mobile shell
- browser pass for desktop sidebar and governance entry
- targeted component tests and build verification

Output:
- sprint verification notes and screenshots if needed

## Test Matrix

Minimum role coverage:
- employee
- manager or HR
- admin

Minimum route coverage:
- `/dashboard`
- `/notifications`
- `/leave`
- `/employees`
- `/admin`

Minimum viewport coverage:
- desktop
- mobile

## Risks

### Risk 1: Over-correcting mobile nav and hiding useful secondary destinations

Mitigation:
- keep overflow grouped and discoverable
- test representative role journeys before finalizing

### Risk 2: Introducing visual drift between mobile and desktop labels

Mitigation:
- centralize route labels and avoid local aliasing

### Risk 3: Accidental behavior drift through route restructuring

Mitigation:
- change presentation and ordering only
- preserve current route destinations and permission checks

## Definition of Done

Sprint 1 is done when:
- the new mobile journey model is implemented
- overflow reflects the desktop grouping logic
- governance transition clarity is improved
- validation passes on desktop and mobile
- no behavior changes are introduced

## Recommended Follow-up

Sprint 2 should build the route-archetype layout layer so pages can stop overusing the summary-first structure. The highest-priority follow-on pages are:
- `Dashboard`
- `Notifications`
- `Admin Leave Policies`
