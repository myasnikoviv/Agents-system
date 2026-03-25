# AGSYS-34 — Auto-RCA Dedup Hardening

## Context / Problem
Auto-RCA runtime can create duplicate follow-up issues because dedup matched only exact issue title.
When issue titles are auto-prefixed (e.g., `PM-208 ...`), exact matching fails and new duplicates are created.

## Scope
- Harden Auto-RCA issue dedup lookup to match by source ticket signature.
- Keep existing follow-up issue reusable across repeated Auto-RCA runs.
- Return key with source ticket prefix (e.g., `AGSYS-<n>` for AGSYS sources).

## Acceptance Criteria
- Re-running Auto-RCA for the same source ticket does not create duplicate Plane follow-up issues.
- Existing follow-up issue is reused even when title is prefixed/renamed.
- Returned follow-up key uses source ticket prefix instead of hardcoded `TRADE`.

## Expected Pipeline
- `pipeline=bug-fix`
- stages: intake -> implement -> verify -> review -> git -> docs

## Gate
- Unit tests pass for Auto-RCA engine path.
- Git preflight token is present and approved.
- Branch/worktree isolation is respected (`one ticket = one branch = one worktree`).

