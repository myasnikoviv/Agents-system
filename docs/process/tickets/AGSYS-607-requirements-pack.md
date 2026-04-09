# AGSYS-607 Requirements Pack

- Ticket: S25.1-1 — Backend Decomposition Implementation (No God Backend)
- Pipeline: new-feature
- Stage: requirements-pack
- Approver: myasnikov.iv
- Approval Status: approved by owner request in chat
- Timestamp: 2026-04-09

## Objectives
1. Remove god-backend ownership concentration from `src/server/agentSystemBackend.ts`.
2. Group endpoints by domain route modules.
3. Introduce composition root bootstrap.

## Acceptance Criteria
- Backend entrypoint delegates route registration to extracted route modules.
- Domain ownership is explicit for at least core groups:
  - governance
  - swarm/runtime control
  - telemetry/audit
  - settings/providers/auth
- Existing API contracts preserved.

## Out of Scope
- New product features unrelated to decomposition.
- Full infra migration (handled by other sprint 25.1 tickets).
