# AGSYS-485 Requirements Pack

- Ticket: `AGSYS-485`
- Plane issue: `S19-1 — Project-Scoped Agent Identity Model (AGSYS-MA-001)`
- Pipeline: `refactor`
- Created by: `Сокіл-Координатор (PM Orchestrator)`
- Created at: `2026-04-08 15:39 CEST`
- Approval status: `approved-by-owner`
- Approver: `owner`
- Approval timestamp: `2026-04-08 15:39 CEST`

## Goal
Guarantee project-scoped runtime identity for agents (`projectId + agentSlug + workerId`) and strict memory namespace isolation.

## In Scope
- Project-scoped identity contract model and schema.
- Worker identity generation/validation path.
- Memory namespace contract update to include `projectId` in all relevant keys.
- Collision detection for cross-project worker identity reuse.
- Documentation update for runtime identity contract.

## Out of Scope
- Full worker spawn orchestration (S19-3).
- Queue dispatch redesign (S19-6).
- Controller UI rendering polish (S19-11+).

## Acceptance Criteria
1. Same `agentSlug` in different projects produces different runtime identity.
2. Memory namespace includes `projectId` and prevents cross-project bleed.
3. Runtime blocks or flags worker identity collision across projects.
4. Contract documented in runtime docs.

## Evidence Plan
- Unit tests for identity builder/validator.
- Integration test for two projects with same agent slug.
- Runtime telemetry proof showing distinct worker ids.
- Updated docs artifact path.
