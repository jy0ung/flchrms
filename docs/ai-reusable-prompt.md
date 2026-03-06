# Reusable AI Prompt for This Codebase

Use this as the default prompt when asking an AI to work in this repository.

## Master Prompt

```text
You are working in the `flchrms` repository, a Vite + React 18 + TypeScript HRMS application with Tailwind, shadcn-style UI components, TanStack React Query, and Supabase.

Your task:
[DESCRIBE THE TASK CLEARLY]

Repository-specific requirements:
- Start by reviewing the current repo state before making assumptions. Check `git status`, `package.json`, the relevant feature files, and existing tests around the area you will touch.
- Do not overwrite or revert existing user changes unless explicitly asked.
- Follow existing patterns instead of introducing a parallel architecture.
- Use TypeScript strictly. Avoid `any`; if you truly cannot avoid it, isolate it and explain why.
- Prefer `@/` imports for app code.
- Reuse existing UI primitives from `src/components/ui` and shared scaffolding from `src/components/system`.
- Route/page-level screens typically use shared wrappers such as `AppPageContainer`.
- Data fetching and mutations should follow existing React Query + Supabase hook patterns.
- Prefer the typed Supabase client in `src/integrations/supabase/client.ts`. Use `src/integrations/supabase/untyped-client.ts` only as a temporary bridge when generated types are missing, and call that out.
- If the change requires database schema, RPC, trigger, or RLS updates, add a Supabase migration under `supabase/migrations` and update generated Supabase types if needed.
- Preserve role-based access rules and existing permission boundaries. Check `src/lib/permissions.ts`, `src/lib/admin-permissions.ts`, and related auth/role code before changing protected behavior.
- Add or update targeted tests when behavior changes. Favor adjacent unit/component tests and use integration tests for Supabase-backed behavior.

Validation requirements:
- Run the smallest relevant validation set for the files you changed first.
- If useful, also run broader validation such as `npm run lint`, `npm test`, `npm run test:integration`, or a targeted Playwright command.
- Report exactly what you ran and the result.
- If there are pre-existing unrelated failures, do not silently fix or ignore them. Separate them from regressions caused by your change.

Execution requirements:
1. Summarize the relevant existing architecture and file touchpoints.
2. State assumptions, risks, and any missing information.
3. Propose a minimal implementation plan.
4. Make the change.
5. Validate the change.
6. Report:
   - what changed
   - why
   - files touched
   - validation results
   - remaining risks or follow-ups

Output expectations:
- Be concrete and reference files/functions/components by name.
- Keep changes minimal and idiomatic to the repository.
- Prefer fixing root causes over patching symptoms.
- If the request is ambiguous, make the safest reasonable assumption and state it.
```

## Feature Variant

```text
Use the master prompt above.

Task focus:
Add this feature: [FEATURE REQUEST]

Additional instructions:
- Identify the existing feature entry points, hooks, pages, components, types, and Supabase objects involved.
- Keep the UI consistent with the existing app shell, admin sections, dashboard widgets, dialogs, and form patterns already in the repo.
- Extend existing types, validation schemas, and permission checks instead of duplicating them.
- If the feature affects workflows or approval logic, inspect the related `src/lib/*workflow*`, hook, and integration test files first.
- Add targeted tests for the new behavior and mention any scenarios not covered.
```

## Troubleshooting Variant

```text
Use the master prompt above.

Task focus:
Investigate and fix this bug: [BUG / ERROR / BROKEN FLOW]

Additional instructions:
- Reproduce the problem from the current code before proposing a fix.
- Trace the issue across UI, hooks, state, Supabase queries/RPCs, and permissions as needed.
- Distinguish confirmed root cause from hypotheses.
- Prefer the smallest fix that addresses the root cause without changing unrelated behavior.
- Add a regression test when practical.
- If you cannot fully reproduce locally, say exactly what you checked and what evidence supports your conclusion.
```

## Audit Variant

```text
Use the master prompt above.

Task focus:
Audit this area of the codebase: [AREA / FEATURE / FILES]

Additional instructions:
- Prioritize findings over summaries.
- Focus on bugs, behavioral regressions, type safety gaps, permission issues, Supabase/RLS risks, data integrity issues, and missing test coverage.
- Rank findings by severity and include precise file references.
- Separate confirmed issues from lower-confidence risks.
- If no concrete findings are found, say that clearly and list residual testing gaps.
- Do not propose large refactors unless they are justified by a specific defect or operational risk.
```

## Current Repo Notes

These repo-specific notes can be pasted under the task when needed:

```text
- Frontend stack: Vite, React 18, TypeScript, Tailwind, shadcn-style UI, React Query.
- Backend/data layer: Supabase client, generated DB types, migrations in `supabase/migrations`.
- Path alias: `@/*` -> `src/*`.
- The codebase already contains page tests, component tests, hook tests, lib tests, and integration tests under `src/test/integration`.
- Existing local work may already be present in the git tree; preserve unrelated changes.
- Prefer targeted validation because the baseline may contain unrelated lint issues.
```

## Example Task Fill-In

```text
You are working in the `flchrms` repository, a Vite + React 18 + TypeScript HRMS application with Tailwind, shadcn-style UI components, TanStack React Query, and Supabase.

Your task:
Add a reusable dashboard widget that shows upcoming document expirations for managers and HR, including Supabase-backed data loading, role gating, and tests.

[Paste the rest of the master prompt here]
```
