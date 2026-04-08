# AGSYS-495 Assumptions Review

- Ticket: AGSYS-495
- Reviewer: PM Orchestrator
- Approval: user implicit go-ahead (`давай`), 2026-04-08

## Assumptions
1. Worker manager is the source of truth for lifecycle + assignment contract.
2. Swarm workers endpoint should return normalized contract rows instead of raw internal record fields.
3. Existing UI integration can adapt with minimal mapping changes once contract becomes explicit.

## Decision
Expose normalized controller contract from worker manager and serve it via swarm endpoints.
