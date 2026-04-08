# AGSYS-492 Assumptions Review

- Ticket: AGSYS-492
- Reviewer: PM Orchestrator
- Approval: user implicit go-ahead (`давай`), 2026-04-08

## Assumptions
1. Fail-fast on hard cap breach is acceptable when no evictable idle workers exist.
2. In-process pool policy is valid phase-1 implementation prior to infra-level autoscaling.
3. Idle pruning can run on read/summary paths in this phase.

## Decision
Implement deterministic cap enforcement + idle pruning in DynamicWorkerSpawnManager.
