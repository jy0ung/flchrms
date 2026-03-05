# Phase 2 Kickoff Plan (Post Phase-1 Closure)

Date (UTC): 2026-03-05
Prerequisite: Phase 1 formally closed (`PHASE1_LEAVE_CORE_CLOSURE.md`)

## Objective

Operationalize enterprise leave workflows for delegation, SLA governance, and month-end controls.

## Execution Order

1. Delegation Runtime
- Add `useLeaveDelegations` hook set (list/create/revoke).
- Add manager/approver delegation UI surface with validity window and scope.
- Add RLS-safe enforcement in decision path where delegate acts on behalf.

2. SLA + Escalation
- Add SLA monitor job and escalation writer to `leave_request_decisions` metadata.
- Add admin/HR SLA dashboard cards for breaches and aging requests.

3. Cancellation Governance v2
- Tighten cancellation decision traces and stage enforcement in v2 cancel/decide paths.
- Add deterministic error mapping for stale status and stage mismatch.

4. Period Close + Payroll Ops
- Add operational UI for `leave_close_period` and `leave_export_payroll_inputs`.
- Add dry-run and reconciliation summary surfaces.

5. Validation + Release Gates
- Add integration tests for delegate approvals and SLA escalation outcomes.
- Add Playwright admin/manager flow coverage for delegation and month-end ops.

## First Slice (Start Next)

- Implement `useLeaveDelegations` hooks and unit tests.
- Wire a minimal "Delegations" section into Leave page for eligible roles.
