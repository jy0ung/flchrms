# Definition of Done (UI Refactor PRs)

Use this as the completion checklist for structural UI migration PRs.

## Required Outcomes

1. Scope control
- PR contains UI structure/composition changes only.
- No behavior/API/schema changes are introduced.

2. Shared component adoption
- Target page/module uses the approved shared system components where applicable.
- No new redundant local layout patterns were introduced.

3. Visual consistency
- Header/action/toolbar/table/modal composition matches current system standards.
- Status visuals use the semantic status system (if in migrated scope).

4. Accessibility baseline
- Keyboard navigation still works for changed interactions.
- Dialog focus/escape behavior preserved (if dialogs touched).
- Icon-only actions have accessible labels.

5. Regression safety
- `npm run build` passes
- `npm run lint -- --quiet` passes
- `npm run test` passes

6. Visual verification
- Required visual smoke checks completed for impacted pages/modules.
- Screenshots or explicit pass/fail notes included in PR.

7. Risk handling
- Risk level declared (Low/Medium/High)
- Mitigations listed and executed
- Follow-ups captured if scope intentionally deferred

## Acceptance Criteria by Change Type

### Shared Component Introduction
- API documented (props + usage examples in PR description)
- Existing pages not broken by primitive changes
- Backward compatibility maintained or migration plan provided

### Page/Module Migration
- Old local composition removed or reduced
- Layout is responsive at tested breakpoints
- Toolbars and actions preserve function and discoverability

### Modal Standardization
- Header/body/footer hierarchy is clear
- Close button placement follows modal standard
- Footer actions remain visible and ordered correctly

### Accessibility Hardening
- Contrast/readability issues are specifically identified and resolved
- No regressions in focus management

## Explicit Non-DoD Items (Do not block merge)
- Pixel-perfect redesign
- New branding/theme changes
- New feature requests discovered during refactor
- Broad cosmetic improvements outside target scope

