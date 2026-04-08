# AGSYS-488 Requirements Pack

- Ticket: AGSYS-488
- Sprint: Sprint 19
- Pipeline: refactor
- Prepared by: PM Orchestrator
- Approved by: user (`давай`), 2026-04-08

## Goal
Separate worker availability lifecycle states from execution state and enforce deterministic transitions.

## Required States
- cold
- starting
- hot
- active
- standby
- stopping
- failed

## Acceptance Criteria
1. States above are documented and implemented.
2. `standby` is not used as synonym for `hot`.
3. State transitions are deterministic and validated.
4. Runtime emits event on each state change.
