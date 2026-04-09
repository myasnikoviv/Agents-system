# AGSYS-486 Requirements Pack

- Ticket: AGSYS-486
- Sprint: Sprint 19
- Pipeline: feature-change
- Prepared by: PM Orchestrator
- Approved by: user (`давай`), 2026-04-08

## Goal
Introduce on-demand worker spawning per project-scoped agent identity and prevent eager activation of all agents.

## Acceptance Criteria
1. Worker is created only when a stage needs that agent.
2. Worker identity is bound to project-scoped agent identity.
3. Spawn/reuse results are visible as runtime events.
4. System does not eagerly spawn all project agents by default.
