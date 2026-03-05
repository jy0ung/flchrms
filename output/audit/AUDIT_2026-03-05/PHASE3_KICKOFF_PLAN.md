# Phase 3 Kickoff Plan (Post Phase-2 Closure)

Date (UTC): 2026-03-05  
Prerequisites:
- `PHASE1_LEAVE_CORE_CLOSURE.md` = closed
- `PHASE2_LEAVE_CORE_CLOSURE.md` = closed

## Objective

Deliver Phase 3 leave-core scope: forecasting, liability analytics, simulation tooling, and multi-country onboarding scaffolding.

## Execution Order

1. Liability and Forecast Foundations
- Add forecast and liability schema (`leave_liability_snapshots`, `leave_forecast_runs`, `leave_forecast_rows`).
- Add RPCs: `leave_generate_liability_snapshot(...)`, `leave_run_forecast(...)`.
- Add deterministic input dimensions (policy version, timezone basis, headcount scope).

2. Simulation Tooling
- Add what-if RPCs: `leave_simulate_policy_change(...)`, `leave_simulate_accrual_scenario(...)`.
- Return delta outputs vs baseline (days, monetary liability, affected employees).
- Add guardrails for read-only simulation (no writes to operational balances).

3. Multi-Country Scaffolding
- Add statutory pack tables: `leave_country_packs`, `leave_country_pack_versions`.
- Add resolver function that maps legal entity/location to active pack.
- Keep Malaysia pack as default; no behavioral regression for existing MY policies.

4. Analytics UX Surfaces
- Add HR/admin pages/cards for forecast trends and liability by unit/cost center.
- Add simulation UI (inputs + comparison outputs + export).
- Add audit-safe export for reviewed forecast runs.

## Slice Plan

### Slice 1 (Start)
- DB migration for liability/forecast entities + base RPC stubs.
- Supabase type regeneration.
- Integration tests for deterministic snapshot/forecast outputs.

### Slice 2
- Simulation RPCs + validation rules + integration tests.

### Slice 3
- Country-pack scaffolding + resolver + MY default pack backfill.

### Slice 4
- Frontend analytics and simulation UI with role/capability guards.

## Release Gates

1. Reproducibility
- Same inputs produce identical liability/forecast outputs.

2. Safety
- Simulation paths cannot mutate live balances or approvals.

3. RBAC
- Employee/manager denied from admin analytics mutating paths.
- HR/admin permissions enforced consistently frontend + backend.

4. Regression
- Existing leave request/approval/cancellation flows remain green.

5. Evidence
- Store logs under `output/audit/AUDIT_2026-03-05/logs/leave-core-phase3/`.

## Closure Criteria

- Forecast and liability outputs validated against known test periods.
- Simulation deltas verified for at least 3 policy-change scenarios.
- Country-pack resolver active with MY default and no policy regressions.
- Build and integration gates pass; targeted Playwright admin HR analytics smoke passes.
