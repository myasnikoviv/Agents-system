# AGSYS-491 Requirements Pack

- Ticket: AGSYS-491
- Sprint: Sprint 19
- Pipeline: sprint-integration
- Prepared by: PM Orchestrator
- Approved by: user (`давай`), 2026-04-08

## Goal
Make `multiple_agents` runtime path distinct from linear path and prove distributed bootstrap with parallel worker preparation.

## Acceptance Criteria
1. `multiple_agents` uses dedicated runtime entrypoint (not same direct path as linear).
2. Runtime performs parallel bootstrap for at least two workers when agent set allows.
3. Queue/worker events are visible in event stream and cockpit feed.
4. Swarm Controller panel is backed by backend summary (workers + queue pressure).
