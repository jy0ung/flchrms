# FLCHRMS Specification Suite

## Metadata
- Product: FLCHRMS (HR Management System)
- Repository: `jy0ung/flchrms`
- Snapshot date: March 2, 2026
- Source of truth: application code in `src/` and Supabase assets in `supabase/`

## Purpose
This specification set documents the current implemented behavior of the FLCHRMS application. It is organized into focused documents so product, engineering, QA, and operations teams can reference the parts they need without maintaining one very large file.

## Document Map
1. `01-product-functional-spec.md`
- Functional behavior by module (auth, leave, payroll, admin, etc.)
- Route access and role-based capabilities
- End-user workflows and business rules

2. `02-technical-architecture-spec.md`
- Frontend/backend architecture
- Runtime patterns, state management, and UI system conventions
- Integration and reliability characteristics

3. `03-data-security-spec.md`
- Database schema inventory
- RPC catalog, storage buckets, and audit/event model
- RLS and security constraints reflected in SQL tests and code

4. `04-operations-quality-spec.md`
- Environment requirements and scripts
- CI pipeline and automated test strategy
- Deployment and operational guidance

## Usage Guidance
- Start with `01-product-functional-spec.md` for feature and role behavior.
- Use `03-data-security-spec.md` when making schema or permission changes.
- Use `04-operations-quality-spec.md` for release, testing, and deployment planning.
- Update this suite when routes, roles, schema, workflows, or CI behavior changes.
