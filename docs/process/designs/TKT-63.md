# TKT-63 Design: Cockpit E2E Reliability Matrix

## Objective
Validate API-level task flow used by cockpit UI: send task, interrupt on gates, approve progression, complete execution.

## Covered Flow
1. `POST /api/chat` returns `awaiting_approval` and `threadId`.
2. `POST /api/chat/approve` advances to next interrupt gate.
3. Repeated approve calls eventually complete run with final logs.

## Notes
- Uses in-process app server binding (`listen(0)`) for deterministic tests.
- Agent executor mocked for stable deterministic output.
