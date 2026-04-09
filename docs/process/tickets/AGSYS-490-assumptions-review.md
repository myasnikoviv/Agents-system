# AGSYS-490 Assumptions Review

- Ticket: AGSYS-490
- Reviewer: PM Orchestrator
- Approval: user implicit go-ahead (`давай`), 2026-04-08

## Assumptions
1. Initial queue rollout can be in-process while preserving project/agent isolation contract.
2. Runtime event bus is enough for queue observability in first iteration.
3. Queue contract can be upgraded later to Redis-backed transport without changing swarm integration points.

## Decision
Implement project-scoped dispatch queue contract and integrate into swarm stage dispatch path.
