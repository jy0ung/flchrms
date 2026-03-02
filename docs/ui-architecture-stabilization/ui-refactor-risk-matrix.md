# Risk Matrix for Structural UI Refactors

This matrix standardizes how UI architecture refactor risk is assessed and mitigated.

## Risk Levels

- `Low`: Local structural changes with limited blast radius
- `Medium`: Shared composition changes affecting multiple pages
- `High`: Shared primitives or layout systems affecting broad UX surfaces

## Risk Matrix

| Change Type | Typical Blast Radius | Risk | Common Failure Modes | Required Mitigations |
|---|---|---:|---|---|
| Page-local layout cleanup (single page) | 1 page | Low | spacing drift, mobile wrapping issues | build/lint/test + page visual smoke |
| Module table toolbar consolidation | 1 module / several screens | Low-Medium | action placement regressions, search/filter alignment | build/lint/test + module smoke + mobile check |
| Introduce `PageHeader` / `SectionToolbar` | multi-page | Medium | header action alignment drift, duplicated patterns during migration | shared component docs + 5-page smoke set |
| Introduce `DataTableShell` | multi-module list/table pages | Medium | empty-state/pagination/overflow regressions | targeted module migration + desktop/mobile verification |
| Modal composition standardization | dialogs across app | Medium-High | close/action misplacement, focus regressions | keyboard checks + dialog smoke in key modules |
| Shared primitive changes (`ui/*`) | app-wide | High | cross-module visual regressions, layout breakages | full 5-page smoke + role matrix + regression commands |
| Dashboard layout model changes | high-visibility core page | High | widget holes, clipping, broken customization controls | dashboard role smoke + resize/reorder checks + fallback plan |
| Accessibility hardening (system-level) | app-wide | Medium | style regressions or overcorrection | contrast checklist + keyboard smoke + staged rollout |

## Risk Trigger Conditions (Escalate Review)

Treat the PR as `High` risk if any apply:

- touches `src/components/ui/dialog.tsx` or `src/components/ui/alert-dialog.tsx`
- touches multiple shared primitives in `src/components/ui/*`
- changes dashboard widget layout or customization behavior
- migrates more than 3 pages/modules in one PR
- changes both shared components and page implementations together without isolation

## Mitigation Strategy by Risk Level

### Low
- Standard regression commands
- Visual smoke on impacted page(s)
- One reviewer

### Medium
- Standard regression commands
- Required 5-page visual smoke if shared component touched
- At least one mobile breakpoint verification
- Two reviewers recommended (or one reviewer + author-provided screenshots)

### High
- Standard regression commands
- Full 5-page smoke + role coverage
- Keyboard/focus check on affected interactions
- Incremental rollout plan or feature flag (if applicable)
- Follow-up issue list for deferred edge cases

## Rollback Strategy (Structural UI Refactors)

For Medium/High risk PRs, define before merge:
- easy revert path (single commit / isolated changes)
- pages/modules impacted
- known edge cases not covered

If regressions are found post-merge:
1. Revert PR (preferred for structural UI regressions)
2. Open follow-up issue with screenshots and exact breakpoints
3. Re-ship as a smaller, isolated PR

