# AGSYS-493 Assumptions Review

- Ticket: AGSYS-493
- Reviewer: PM Orchestrator
- Approval: user implicit go-ahead (`давай`), 2026-04-08

## Assumptions
1. Active workers for non-active projects may remain only if currently executing; idle workers must be cleaned.
2. Queue cleanup for non-active projects on switch is acceptable and desired to avoid stale dispatch.
3. Policy execution should be deterministic and return measurable counters.

## Decision
Apply project switch policy in `/api/cockpit/projects/select` with cleanup summary response.
