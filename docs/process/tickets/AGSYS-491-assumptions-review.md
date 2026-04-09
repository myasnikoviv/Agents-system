# AGSYS-491 Assumptions Review

- Ticket: AGSYS-491
- Reviewer: PM Orchestrator
- Approval: user implicit go-ahead (`давай`), 2026-04-08

## Assumptions
1. Phase-1 distributed mode can reuse unified swarm executor as execution core if orchestration path is separate and distributed bootstrap is explicit.
2. Parallel worker bootstrap is sufficient initial proof of distributed behavior.
3. Cockpit summary endpoint is the right source-of-truth for Live Hive state card.

## Decision
Implement dedicated multiple-agents runtime wrapper + backend summary endpoint + cockpit wiring.
