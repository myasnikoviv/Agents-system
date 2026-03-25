# OPS-905: Plane Local Runtime Bootstrap

## Type
Ops / Infrastructure

## Priority
high

## Owner
- Primary: `Техно-Рятівник (DevOps Engineer)`
- Support: `Пан Гілка (Git Flow Manager)`
- Requestor: `Сокіл-Координатор (PM Orchestrator)`

## Context / Problem
Plane must run locally as the mandatory ticketing control-plane, but startup failed with `[plane] docker is required`.

## Scope
- Verify Docker availability and daemon health.
- Start Plane via `scripts/plane/up.sh`.
- Validate service health via `scripts/plane/status.sh`.
- Record operational steps and blockers in ops evidence.

## Out Of Scope
- MCP server implementation.
- Ticket content migration.

## Expected Pipeline (Mandatory)
1. PM Orchestrator
- Artifact: ticket brief and acceptance lock.
- Handoff condition: scope and DoD approved.
2. Git Flow Manager
- Artifact: git preflight + assigned branch/worktree for any file mutation.
- Handoff condition: preflight recorded.
3. DevOps Engineer
- Artifact: runtime bootstrap evidence (`up/status/logs` outputs) and remediation notes.
- Handoff condition: Plane reachable or hard blocker documented.
4. PM Orchestrator
- Artifact: accept/rework decision.
- Handoff condition: execution logs attached.

## Dependencies
- Docker Desktop/Engine installed.
- Access to `scripts/plane/.env`.

## Acceptance Criteria
1. `scripts/plane/up.sh` completes successfully.
2. `scripts/plane/status.sh` confirms healthy services.
3. Local URL is reachable and documented.
4. If blocked, blocker root cause and fix path are documented.

## Evidence Required
- Command outputs for `up.sh`, `status.sh`, `logs.sh`.
- Ops note in `docs/process/ops/`.

## Status
- State: `Done`
- Current owner: `Сокіл-Координатор (PM Orchestrator)` (acceptance)

## Execution Log
1. Initial run failed with `[plane] docker is required`.
2. Docker runtime became available.
3. Re-run via login shell:
   - `./scripts/plane/up.sh` -> `Started`
   - `./scripts/plane/status.sh` -> services healthy and URL reachable.
4. Ops evidence recorded in:
   - `docs/process/ops/PLANE-LOCAL-HEALTH-2026-03-16.md`

## Handoff Log
- `DevOps -> PM`: runtime bootstrap completed with health evidence attached.
- `PM`: accepted and closed.
