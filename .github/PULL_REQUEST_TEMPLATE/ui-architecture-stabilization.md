## UI Architecture Stabilization PR (Structural Refactor)

Use this template for UI refactor/migration PRs that unify composition patterns without changing behavior.

### Scope (required)
- [ ] UI-only structural changes
- [ ] No behavior changes
- [ ] No API changes
- [ ] No schema/database changes
- [ ] No RBAC/workflow logic changes

### What is being migrated? (required)
- [ ] Semantic status rendering
- [ ] Page header composition
- [ ] Section toolbar composition
- [ ] Data table shell
- [ ] Modal composition
- [ ] Accessibility hardening
- [ ] Dashboard layout model
- [ ] Other (describe below)

### Summary
Describe the structural UI changes and affected modules/pages.

### Shared Components / APIs Introduced or Updated
List new or changed component APIs (props, slots, usage constraints).

### Pages / Modules Impacted
- [ ] Dashboard
- [ ] Leave
- [ ] Payroll
- [ ] Admin (HR Admin)
- [ ] Profile
- [ ] Employees
- [ ] Documents
- [ ] Notifications
- [ ] Attendance
- [ ] Team Calendar
- [ ] Training
- [ ] Performance
- [ ] Announcements
- [ ] Other: __________

### Risk Assessment
- Risk level: `Low / Medium / High`
- Why:
- Blast radius:

### Guardrail Compliance
- [ ] No local duplicate pattern introduced where shared component exists
- [ ] No page-local standard status map added
- [ ] Action hierarchy preserved (primary/secondary)
- [ ] Accessibility basics preserved (focus/keyboard/escape/tab order)

### Regression Safety (required)
- [ ] `npm run build`
- [ ] `npm run lint -- --quiet`
- [ ] `npm run test`

If shared UI primitives or layout system changed:
- [ ] 5-page visual smoke (Dashboard, Leave, Payroll, Admin, Profile)

### Visual Smoke-Test Evidence (required)
- Browser:
- Viewports:
- Roles tested:
- Evidence links/screenshots or pass/fail notes:

### Definition of Done (required)
- [ ] Shared component adoption completed for intended scope
- [ ] Visual consistency matches current system standards
- [ ] Responsive layout checked for impacted pages
- [ ] Follow-up issues documented for deferred edge cases

### Scope Exceptions (if any)
Document any unavoidable deviation from the guardrails and the follow-up issue.

