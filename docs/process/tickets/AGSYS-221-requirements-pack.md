# Requirements Pack: AGSYS-221

- Ticket: `AGSYS-221`
- Title: `Dynamic Swarm Runtime Refactor (TZ #2)`
- Pipeline: `refactor`

## Context
Transition runtime orchestration away from hardcoded graph behavior into dynamic swarm execution with discoverable agents/pipelines/skills and standardized run context.

## Scope
- Validate dynamic discovery infrastructure is active in runtime.
- Validate swarm node path is the active orchestration flow.
- Validate run context and swarm events are emitted and consumable.
- Stabilize runtime proof path to use discoverable pipeline+stage in current repo layout.

## Acceptance Criteria
- Discovery indexes agents/pipelines/skills from docs/project manifests.
- Swarm node is active dynamic execution path.
- RunContext and event bus are wired and exercised in proof run.
- Postflight evidence captured.

## Approval Traceability
- Approver: Owner (chat)
- Approval status: Approved
- Approved at: 2026-03-27T23:02:51+01:00
