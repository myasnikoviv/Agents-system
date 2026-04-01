# AGSYS-444 Runtime Schema Enforcement Note (2026-04-01)

## Objective
Harden runtime event output schema at the EventBus boundary.

## Implemented

- `src/runtime/events/EventBus.ts` now applies:
  - input normalization from legacy fields (`event_type`, `pipeline_run_id`, `plane_issue_id`, `thread_id`) to canonical runtime fields (`type`, `runId`, `projectId`, `chainId`),
  - structural validation for required canonical fields,
  - payload object validation,
  - compatibility warning for unknown event types (non-blocking to avoid legacy runtime interruption).

## Why this closes the gap

- Introduces a single canonical boundary for runtime event shape before Redis + ledger writes.
- Prevents malformed events from being persisted.
- Preserves legacy execution paths during migration.

## Next hardening step

- Tighten unknown-type compatibility mode into strict allowlist mode after legacy emitters are migrated.
