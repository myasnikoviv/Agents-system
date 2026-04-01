# AGSYS-448 Legacy Purge Closure (2026-04-01)

## Goal
Remove runtime legacy event-contract drift and keep only canonical runtime contract.

## Completed

1. Runtime event contract made strict canonical in EventBus.
- Removed legacy compatibility fallback for event field aliases.
- Enforced canonical required fields and known event-type validation.

2. Runtime core state naming migrated.
- `plane_issue_id -> ticketId`
- `pipeline_run_id -> runId`
- `thread_id -> threadId`
- Applied across runtime graph/integration execution paths.

3. Runtime manager/worker/inspector paths migrated to canonical fields.

4. Runtime test fixtures migrated to canonical event fields.

## Evidence (commits)
- `d23bf3a` — migrate worker/manager paths to canonical event contract.
- `5b37f7e` — remove legacy runtime event fields and enforce canonical contract.
- `a6478a7` — migrate runtime test fixtures to canonical event fields.

## Validation
- Command: `npx tsx src/runtime/__tests__/governance_gates.test.ts`
- Result: PASS

## Residual notes
- Remaining `thread_id` matches are DB column names in message storage SQL and are not runtime event-contract drift.

## Closure decision
- AGSYS-448 scope accepted as closed for runtime legacy purge baseline.
