# AGSYS-297 — PM-S0.5-4 Event Mapping Spec

## Summary

Formalize strict `event.type -> UI target` contract so cockpit rendering is deterministic and traceable.

## Source Inputs

- `docs/process/roadmaps/pm-pack/sprint0_5.md` (Task B1/B2)
- `docs/process/roadmaps/pm-pack/tickets.md` (TASK S0.5-4)

## Scope

- Create `docs/runtime/event-ui-contract.md` with canonical event mapping table.
- Define deterministic rules for unknown events and chat/timeline separation.

## Acceptance Criteria

1. Each runtime event has explicit UI mapping.
2. One event produces one UI block.

## Out of Scope

- UI implementation changes.
- Event transport protocol changes.
