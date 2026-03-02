# FLCHRMS Application Specification

## Status
This document is now the entrypoint for the canonical specification suite.

Current canonical specs:
- `docs/specs/README.md`
- `docs/specs/01-product-functional-spec.md`
- `docs/specs/02-technical-architecture-spec.md`
- `docs/specs/03-data-security-spec.md`
- `docs/specs/04-operations-quality-spec.md`

## Why this change
The previous single-file specification was hard to maintain and had drift risk as modules evolved quickly. The spec is now split by concern so product, engineering, and operations updates can be maintained independently.

## Snapshot metadata
- Repository: `jy0ung/flchrms`
- Snapshot date: March 2, 2026
- App shape: React SPA + Supabase backend

## Quick navigation
1. Functional behavior and role access
- `docs/specs/01-product-functional-spec.md`

2. Frontend/backend architecture
- `docs/specs/02-technical-architecture-spec.md`

3. Schema, RPC, and security model
- `docs/specs/03-data-security-spec.md`

4. Testing, CI/CD, and deployment operations
- `docs/specs/04-operations-quality-spec.md`
