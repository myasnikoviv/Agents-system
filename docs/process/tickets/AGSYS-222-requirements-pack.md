# Requirements Pack: AGSYS-222

- Ticket: `AGSYS-222`
- Title: `Phase 1 - Discovery Layer (Advanced)`
- Pipeline: `refactor`

## Context
Phase-1 objective is dynamic discovery of agents/pipelines/skills from project docs/manifest, replacing static registry assumptions.

## Scope
- Validate `DynamicDiscoveryService` discovers from manifest/docs.
- Validate registries are populated for agents/pipelines/skills.
- Attach reproducible smoke evidence.

## Acceptance Criteria
- Discovery service exposes `discoverAll/Agents/Pipelines/Skills` and manifest path parsing.
- Discovery smoke test passes.

## Approval Traceability
- Approver: Owner (chat)
- Approval status: Approved
- Approved at: 2026-03-28T00:19:34+01:00
