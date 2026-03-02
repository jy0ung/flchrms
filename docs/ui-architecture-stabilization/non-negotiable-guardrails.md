# Non-Negotiable Guardrails for Structural UI Refactors

This document defines mandatory constraints for UI architecture stabilization work.

## 1. Scope Freeze (Behavioral Freeze)

UI refactor PRs must not change:
- business logic
- RBAC behavior
- module workflows
- API contracts
- database schema/migrations
- query/mutation behavior
- validation rules (unless purely presentational and functionally equivalent)

Allowed:
- component extraction
- layout composition changes
- semantic status rendering normalization (visual only)
- modal composition standardization
- spacing/alignment/structure changes
- accessibility improvements that do not alter business behavior

Not allowed in UI refactor PRs:
- adding new features
- changing backend calls
- changing table/RPC payload shapes
- introducing new persistence keys unless explicitly part of approved layout migration

## 2. Structural Refactor Rules

1. Reuse shared components before creating local patterns.
2. New page-level layouts must use approved system components (when available):
   - route wrapper: `AppPageContainer`
   - header: `PageHeader` (`shellDensity="compact"` by default; use `metaSlot` for secondary controls)
   - section wrapper: `SurfaceSection` or `DataTableShell`
   - toolbar: `SectionToolbar`
   - semantic states: `StatusBadge`
   - dialogs: `ModalScaffold` + `ModalSection`
3. No page-local status color maps for standardized statuses after status-system migration starts.
4. No duplicate header/toolbar implementations when `PageHeader` / `SectionToolbar` exist.
5. No inline ad hoc dialog composition when modal scaffold standards exist.
6. No new route-level local mode state (`isEditing`, `isBulkMode`, `isManageMode`, `isCustomizeMode`) after interaction-mode migration. Use `useInteractionMode`.
7. Route-level mode toggles must live in `PageHeader` actions region.

## 3. PR Sizing and Change Isolation

Each UI refactor PR should target one structural concern:
- one shared component introduction, or
- one module migration to shared components, or
- one accessibility hardening pass for a small set of pages

Avoid combining:
- shared component creation
- multiple page migrations
- unrelated bug fixes

Exception:
- small compatibility patch required to complete migration safely

## 4. Regression Safety Rules

Mandatory for every UI refactor PR:
- `npm run build`
- `npm run lint -- --quiet`
- `npm run test`

If the PR touches RBAC-sensitive pages or workflows (Leave/Admin/Payroll):
- run applicable smoke checks and document results

If the PR touches shared UI primitives (`src/components/ui/*`):
- run a broader visual smoke pass on key pages (Dashboard, Leave, Payroll, Admin, Profile)

## 5. Accessibility Rules (Minimum Standard)

Do not regress:
- keyboard navigation
- dialog close via `Escape`
- focus visibility
- focus trap behavior in dialogs
- tab order sanity

Any new icon-only button must have:
- an accessible label (`aria-label` or `sr-only` text)

## 6. Review and Approval Rules

A UI refactor PR must be reviewed for:
- scope adherence (no behavior drift)
- component reuse compliance
- visual consistency with existing design system direction
- accessibility basics

Reviewers should reject PRs that:
- mix behavior changes into UI migration
- create new local visual patterns without justification
- skip required smoke-test evidence

## 7. Temporary Exceptions

Exceptions must be documented in the PR under:
- `Scope Exceptions`
- `Why unavoidable`
- `Follow-up cleanup issue`

No undocumented exceptions.
