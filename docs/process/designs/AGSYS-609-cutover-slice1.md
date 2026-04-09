# AGSYS-609 — FS-to-Centralized Cutover Slice 1

- Ticket: AGSYS-609
- Date: 2026-04-09
- Branch: codex/s19-runtime-remediation

## Scope
Switch critical telemetry/audit read paths from filesystem-first to centralized-first with safe fallback.

## Changes
1. `PostgresControlPlaneStore`:
   - Added `listAuditActions()` to read persisted audit metadata from Postgres.
2. `EventBus`:
   - Added `fetchEventsByRunId()` to retrieve run-scoped events from Redis runtime stream.
3. `agentSystemBackend.ts`:
   - `readControlActionAuditRows` converted to async and now reads Postgres first, fallback to JSONL file.
   - `readRunLedgerEvents` converted to async and now reads Redis events first (run-scoped or recent), fallback to JSONL ledger files.
4. `telemetryRoutes.ts`:
   - Updated deps contracts to async readers.
   - Updated handlers to await centralized readers.

## Impact
- Critical telemetry/audit retrieval is no longer dependent on local file copy presence in normal operation.
- Legacy files remain fallback-only for compatibility during migration.

## Slice 2 (Centralized-Primary Audit Writes)
1. Updated `appendControlActionAudit` in backend:
   - Postgres audit persistence is now primary write path.
   - FS JSONL write switched to optional mirror mode.
2. Added mirror control via env `RUNTIME_AUDIT_FS_MIRROR`:
   - `always` -> always mirror to FS
   - `never` -> never mirror to FS
   - default behavior -> mirror only when Postgres is not enabled

This reduces local-file coupling not only on reads, but also on new audit writes.
