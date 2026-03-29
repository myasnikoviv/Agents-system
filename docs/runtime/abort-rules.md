# Abort Rules Contract (AGSYS-303)

## Purpose

Guarantee that every run can terminate safely under deterministic abort conditions.

## Abort Conditions

A run must abort when any of these conditions is true:

1. `token budget exceeded` (from budget guardrail).
2. `max retries exceeded` for any stage.
3. `loop detector triggered` (duplicate stage/prompt cycle over threshold).
4. `provider hard error` with non-retriable class.
5. `hard timeout exceeded` (`run_timeout_ms`).
6. `user cancel` signal received.

## Abort Behavior

1. Emit `abort.requested` with reason and source.
2. Stop new stage/tool dispatch.
3. Attempt graceful stop of in-flight execution.
4. Emit terminal event: `run.failed` (or `run.cancelled` for user cancel).
5. Persist final abort artifact: reason, stage, counters, last successful checkpoint.

## Error Surface Policy

- User-facing channel receives concise human-readable reason.
- Detailed provider payload stays in debug artifact/timeline only.
- No raw JSON dump in main chat.

## Acceptance Mapping (`PM-S0.5-10`)

- run terminates on threshold exceed conditions.
