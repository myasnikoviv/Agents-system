# AGSYS-31 — Integration Wave (AGSYS-27/28/29/34)

## Context / Problem
Multiple Agent System tickets were implemented in isolated branches and must be integrated into a single, verified wave before merge to `main`, while preserving preflight/worktree governance and avoiding drift.

## Scope
- Merge AGSYS-34, AGSYS-28, AGSYS-27, AGSYS-29 into `codex/AGSYS-31-integration-wave`.
- Resolve merge conflicts without reverting accepted scope.
- Execute integration verification (runtime tests + frontend build).
- Publish integration evidence and finalize git cleanup.

## Acceptance Criteria
- All target branches are merged into AGSYS-31 integration branch.
- Integration test suite for touched scope passes.
- Frontend build passes on merged state.
- No unresolved merge markers remain.
- Evidence is posted in Plane for AGSYS-31.

## Expected Pipeline
- `pipeline=release`
- stages: preflight -> integration-merge -> integration-verification -> evidence -> handoff

## Gate
- Preflight token exists and matches current branch/worktree.
- Pipeline-state artifact is present and executable.
- Integration verification passes before final merge decision.
