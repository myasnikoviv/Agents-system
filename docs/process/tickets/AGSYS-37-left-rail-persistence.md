# AGSYS-37 — Left Rail Persistence

## Context / Problem
Left rail threads are hardcoded/in-memory and reset on restart, so project/session continuity is lost.

## Scope
- Persist cockpit chains state for left rail threads.
- Load persisted state on server startup.
- Save state when creating new thread.

## Acceptance Criteria
- Left rail threads survive server restart.
- `/api/cockpit/chains` returns persisted state.
- `POST /api/cockpit/chains` writes state to durable file.

## Expected Pipeline
- `pipeline=new-feature`
- stages: intake -> developer -> qa -> reviewer -> git -> docs

## Gate
- Preflight token valid for branch/worktree.
- Runtime build/tests pass for touched scope.
