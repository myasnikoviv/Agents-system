# AGSYS-489 Assumptions Review

- Ticket: AGSYS-489
- Reviewer: PM Orchestrator
- Approval: user implicit go-ahead (`давай`), 2026-04-08

## Assumptions
1. Heartbeat during active stage execution is sufficient for first heartbeat rollout.
2. Health state can be derived from heartbeat age (`healthy` / `stale` / `dead`) without external daemon monitor.
3. Polling `/api/cockpit/swarm/workers` every few seconds is acceptable for cockpit UX.

## Decision
Implement in-process heartbeat loop + health snapshot API + cockpit polling integration.
