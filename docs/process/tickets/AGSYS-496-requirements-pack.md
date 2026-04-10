# Requirements Pack — AGSYS-496

- Ticket: AGSYS-496
- Pipeline: sprint-integration
- Stage: requirements-pack
- Owner: PM Orchestrator
- Date: 2026-04-08

## Goal
Validate end-to-end that runtime in `multiple_agents` mode is real multi-agent execution (not imitation), with reproducible evidence.

## Scenario Scope
1. Active project loaded.
2. Required agent set discovered.
3. Workers spawned on demand.
4. At least 2 workers execute in parallel.
5. Heartbeats visible.
6. Queue dispatch works.
7. Swarm controller reflects real runtime state.

## Acceptance Criteria
1. Reproducible scenario with command/evidence links.
2. Parallel execution proven by independent worker traces.
3. No central single-process default pretending to be multi-agent.
4. Project isolation preserved.
5. Validation report produced at `docs/process/tests/AGSYS-496.md`.

## Evidence Sources
- `docs/process/runs/chat-flow/report-1775652578081.json`
- `docs/process/runs/ledger/*.jsonl`
- Backend health and cockpit API responses.
