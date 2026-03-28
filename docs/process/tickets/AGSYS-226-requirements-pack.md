# Requirements Pack: AGSYS-226

- Ticket: `AGSYS-226`
- Title: `Phase 5 - Cockpit Observability Enhancement`
- Pipeline: `refactor`

## Context
Cockpit must surface runtime observability (active role, pipeline, stage, transitions) for operators in both chat feed and right-side live panel.

## Scope
- Verify UI observability card and live runtime rows are wired to SSE/runtime events.
- Verify event-to-chat propagation for stage lifecycle updates.
- Verify backend event payload schema supports role/pipeline/stage metrics.

## Acceptance Criteria
- Cockpit renders pipeline/stage/next-stage in observability widget.
- Cockpit renders live agent rows with status + stage/task fields.
- SSE event schema includes `agent_role`, `source_stage`, `payload.stageId`, and run lifecycle signals.

## Approval Traceability
- Approver: Owner (chat)
- Approval status: Approved
- Approved at: 2026-03-28T10:24:20+01:00
