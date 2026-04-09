# AGSYS-493 Requirements Pack

- Ticket: AGSYS-493
- Sprint: Sprint 19
- Pipeline: feature-change
- Prepared by: PM Orchestrator
- Approved by: user (`давай`), 2026-04-08

## Goal
Implement active-project priority policy during project switch and prevent cross-project runtime bleed.

## Acceptance Criteria
1. On project switch, runtime activates selected project catalog.
2. Non-active project queued tasks are dropped.
3. Idle workers of non-active projects are cleaned.
4. Switch policy result is returned by backend for observability.
