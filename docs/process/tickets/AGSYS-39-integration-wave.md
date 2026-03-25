# AGSYS-39 — AGSYS Integration Wave (33/35/36/37/38)

## Context / Problem
Validated execution branches exist for AGSYS-33, AGSYS-35, AGSYS-36, AGSYS-37, AGSYS-38.
Mainline still does not contain this wave and requires integrated verification.

## Scope
- Create integration branch/worktree.
- Merge AGSYS-33/35/36/37/38.
- Resolve merge conflicts if present.
- Run regression verification.
- Merge integration wave to main and cleanup.

## Acceptance Criteria
- All wave branches are integrated without unresolved conflicts.
- Regression checks pass on integration branch.
- Main reflects merged integration commit.

## Expected Pipeline
- `pipeline=release`
- stages: intake -> integrate -> verify -> merge -> cleanup

## Gate
- Approved git preflight token exists.
- Regression evidence added in Plane.
- Worktree cleanup sweep executed post-merge.
