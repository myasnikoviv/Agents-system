# Requirements Pack: AGSYS-224

- Ticket: `AGSYS-224`
- Title: `Phase 3 - Provider Execution Adapter`
- Pipeline: `refactor`

## Context
Adapter layer must execute with a standardized runtime contract from `RunContext` to reduce provider/backend drift.

## Scope
- Normalize backend selection from `RunContext.executionTarget` in `AgentExecutor`.
- Synchronize runtime `provider/model` in context before adapter execution.
- Validate with deterministic adapter smoke.

## Acceptance Criteria
- AgentExecutor resolves backend from runtime context with fallback.
- Context fields `executionTarget/provider/model` are normalized before run.
- Smoke evidence captured.

## Approval Traceability
- Approver: Owner (chat)
- Approval status: Approved
- Approved at: 2026-03-28T00:29:07+01:00
