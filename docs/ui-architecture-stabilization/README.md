# UI Architecture Stabilization (Phase 0 Governance)

This folder contains the governance artifacts for structural UI refactors.

Scope:
- UI composition and architecture unification
- No behavior changes
- No API changes
- No schema/database changes

These documents are intended to be used before and during Phase 1+ work (shared UI architecture components, page migrations, modal standardization, dashboard layout refinement).

## Contents

- `non-negotiable-guardrails.md`
  - Rules that apply to every UI refactor PR.
- `ui-refactor-definition-of-done.md`
  - Exit criteria for structural UI migration PRs.
- `visual-smoke-test-protocol.md`
  - Visual verification strategy and required smoke-test coverage.
- `ui-refactor-risk-matrix.md`
  - Structural refactor risk categories, triggers, and mitigations.
- `phase4-5-interaction-mode-architecture.md`
  - Route-scoped interaction-mode governance, APIs, lifecycle, and migration plan.
- `phase0-information-hierarchy-spec.md`
  - Route-archetype and information hierarchy contract for the next UI/UX architecture pass.
- `sprint1-shell-navigation-execution-plan.md`
  - First implementation sprint for shell and navigation rationalization.
- `whole-app-enterprise-ux-remediation-backlog.md`
  - Prioritized whole-app UX backlog with behavior changes, module order, and acceptance criteria.
- `.github/PULL_REQUEST_TEMPLATE/ui-architecture-stabilization.md`
  - PR checklist template for UI migration PRs.

## Phase 0 Outcomes

Phase 0 does not change the application UI itself. It establishes:
- behavioral freeze during UI refactor work
- migration rules and review standards
- regression safety expectations
- repeatable visual smoke-test protocol

## Usage

1. Open a UI refactor PR using the UI architecture PR template.
2. Follow the guardrails document exactly.
3. Complete the definition-of-done checklist before requesting review.
4. Attach visual smoke-test evidence for the required pages/modules.
