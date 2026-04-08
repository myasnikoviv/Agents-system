# AGSYS-494 Assumptions Review

- Ticket: AGSYS-494
- Reviewer: PM Orchestrator
- Approval: user implicit go-ahead (`давай`), 2026-04-08

## Assumptions
1. Runtime-level worker telemetry is valid source for utilization in phase 1.
2. Aggregation can be computed on-demand from worker snapshot.
3. Optimization policy decisions remain out-of-scope for this ticket.

## Decision
Implement utilization counters in worker manager and expose project-scoped API endpoint.
