# AGSYS-492 Requirements Pack

- Ticket: AGSYS-492
- Sprint: Sprint 19
- Pipeline: refactor
- Prepared by: PM Orchestrator
- Approved by: user (`давай`), 2026-04-08

## Goal
Enforce worker pool resource policies: per-project cap, global cap, eviction policy, and idle-timeout cleanup.

## Acceptance Criteria
1. Max workers per project is configurable and enforced.
2. Global max workers is configurable and enforced.
3. Eviction policy removes idle candidates first.
4. Idle timeout cleanup prunes non-active workers.
