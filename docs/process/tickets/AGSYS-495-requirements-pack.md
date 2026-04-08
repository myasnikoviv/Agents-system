# AGSYS-495 Requirements Pack

- Ticket: AGSYS-495
- Sprint: Sprint 19
- Pipeline: refactor
- Prepared by: PM Orchestrator
- Approved by: user (`давай`), 2026-04-08

## Goal
Upgrade swarm controller backend contract to expose real worker runtime state for UI.

## Contract Fields (project-scoped)
- enabled/disabled
- availability: hot/cold
- execution: active/standby
- heartbeat freshness + age
- assigned task reference

## Acceptance Criteria
1. Backend exposes all fields above.
2. Payload is project-scoped.
3. Contract is documented.
4. UI can consume payload without inference hacks.
