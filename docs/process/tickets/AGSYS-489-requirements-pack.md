# AGSYS-489 Requirements Pack

- Ticket: AGSYS-489
- Sprint: Sprint 19
- Pipeline: bug-fix
- Prepared by: PM Orchestrator
- Approved by: user (`так`), 2026-04-08

## Goal
Provide real worker heartbeat and health visibility so swarm board is based on live worker state instead of only last event snapshots.

## Acceptance Criteria
1. Heartbeat signal exists and updates worker liveness.
2. Health model marks workers as healthy/stale/dead with configurable timeout.
3. Health data is exposed via project-scoped backend endpoint.
4. Cockpit runtime board consumes health view and reflects worker state.
