# AGSYS-487 Requirements Pack

- Ticket: AGSYS-487
- Sprint: Sprint 19
- Pipeline: refactor
- Prepared by: PM Orchestrator
- Approved by: user (`так`), 2026-04-08

## Goal
Load agent/pipeline/skill catalog strictly from active project context and prevent cross-project catalog bleed.

## Scope
- Add project-scoped manifest/catalog loader behavior at backend entry points.
- Keep dispatcher input bound to active project catalog.
- Expose project-scoped catalog to cockpit registry endpoint.

## Acceptance Criteria
1. Runtime for project A sees only project A agent set.
2. Loader executes on project entry and chat run start.
3. No cross-project catalog leakage after switching projects.
4. Dispatcher and swarm-facing endpoints can consume the project-scoped catalog result.
