# Whole-App Enterprise UX Remediation Backlog

This backlog translates the current whole-app audit into an implementation sequence.

Scope:
- information hierarchy
- role-aware behavior
- task priority
- permission signaling
- auditability UX
- mobile navigation clarity

Out of scope:
- visual rebrand
- feature expansion unrelated to existing workflows
- schema changes not required by audited behavior fixes

## Delivery Principles

1. Primary task before supporting context.
2. Role/mode/scope must be explicit on high-impact pages.
3. Safe permission limits should prefer disabled-with-reason over silent disappearance.
4. High-impact governance actions should prefer auditable flows over silent convenience.
5. Mobile should optimize for top tasks, not parity with desktop route lists.

## Backlog

### P0. Dashboard Task Priority

Problem:
- dashboard still behaves partly like a customizable homepage instead of an enterprise task workspace
- customization controls compete with the first decision path

Behavior changes:
- demote dashboard customization below the primary work surface
- keep save/cancel edit controls prominent only while editing
- preserve role-aware dashboard sections, but make the default path more prescriptive than configurable

Acceptance:
- users see operational priorities before personalization controls
- edit mode remains fully available
- no widget regressions

### P1. Notifications Inbox Behavior

Problem:
- notifications still mixes feed reading, maintenance, and filtering too closely

Behavior changes:
- opening a notification should mark it as read by default, with undo
- inbox list remains primary, bulk/maintenance actions remain secondary

Why:
- opening is the clearest intent signal that a notification has been processed
- enterprise inboxes should optimize for throughput, not dual-action friction

Acceptance:
- open action marks read unless already read
- undo is available
- nested-interactive/accessibility safety remains intact

### P2. Permission Signaling Pattern

Problem:
- some actions disappear entirely when the user lacks permission

Behavior changes:
- for non-sensitive controls, show disabled actions with explicit rationale

Why:
- reduces support ambiguity
- clarifies role boundaries without exposing sensitive behavior

Acceptance:
- reusable disabled-with-reason pattern exists
- applied first in admin/governance and employee detail workflows

### P3. Admin Workspace Pattern

Problem:
- stronger leave governance navigation exists, but is not yet the admin standard

Behavior changes:
- adopt a consistent admin workspace navigator across governance modules

Acceptance:
- admin pages use shared navigation/current-workspace/reference rhythm
- read-only governance states are explicit

### P4. Payroll Privacy Preference

Problem:
- payroll amount visibility is currently browser-local

Behavior changes:
- move payroll privacy preference from local-only storage toward user-level persistence

Why:
- enterprise privacy preferences should follow the authenticated user

Acceptance:
- hide/show amount preference survives browser/device changes where supported
- fallback behavior remains safe

### P5. Mobile IA Tightening

Problem:
- mobile still relies too much on `More` discovery for non-primary routes

Behavior changes:
- make mobile route prominence more task-aware by role and context

Acceptance:
- highest-frequency routes are directly reachable
- overflow destinations are grouped by task domain

### P6. Governance Audit UX Expansion

Problem:
- leave balance adjustments are well-audited, but similar patterns are not uniformly visible across governance actions

Behavior changes:
- require reason/comment and expose audit consequence for more high-impact admin changes

Acceptance:
- policy/workflow-impacting edits consistently explain or require audit context

## Suggested Release Order

1. Dashboard
2. Notifications
3. Permission signaling
4. Admin workspace standardization
5. Payroll privacy persistence
6. Mobile IA refinement
7. Broader governance audit UX

## Done Criteria

- each slice is committed independently
- focused tests cover the changed hierarchy or behavior
- build passes
- live smoke is completed on the affected routes before broader rollout
