# AGSYS-607 — Backend Decomposition (Slices 1-2)

- Ticket: AGSYS-607
- Cycle: Sprint 25.1 — SaaS Readiness Remediation
- Date: 2026-04-09
- Branch: codex/s19-runtime-remediation

## Scope
Extract telemetry and audit HTTP handlers from `src/server/agentSystemBackend.ts` into a dedicated route module without changing API contracts.

## Changes
1. Added route module: `src/server/routes/telemetryRoutes.ts`.
2. Moved handlers to module:
   - `GET /api/cockpit/control-actions`
   - `GET /api/cockpit/audit/logs`
   - `GET /api/cockpit/telemetry/unified`
   - `GET /api/cockpit/telemetry/runs/:runId/trace`
3. Introduced dependency-injection boundary (`TelemetryRouteDeps`) so route module consumes existing backend helpers instead of global singleton lookups.
4. Replaced inline handlers in backend with one registration call:
   - `registerTelemetryRoutes(app, { ...deps })`

## Compatibility
- Endpoint paths and response payload shape are preserved.
- Error payload keys remain unchanged (`control_actions_fetch_failed`, `audit_logs_fetch_failed`, `unified_telemetry_fetch_failed`, `run_trace_fetch_failed`).

## Slice 2 (Providers/Settings/Runtime Config)
1. Added route module: `src/server/routes/providerSettingsRoutes.ts`.
2. Moved handlers to module:
   - `GET/POST /api/cockpit/runtime/enforcement`
   - `GET /api/cockpit/providers`
   - `GET/POST /api/cockpit/runtime-footer`
   - `GET /api/cockpit/providers/openhands/health`
   - `GET /api/cockpit/providers/cli/status`
   - `POST /api/cockpit/providers/cli/test`
   - `POST /api/cockpit/providers/cli/login`
   - `POST /api/cockpit/providers/test-message`
   - `POST /api/cockpit/providers/select`
   - `GET/POST /api/cockpit/settings/:section`
3. Added dependency-injection wiring in backend composition root via `registerProviderSettingsRoutes(app, deps)`.

## Next Slice
- Extract chains/project/plane binding endpoints into dedicated module.
- Continue reducing `agentSystemBackend.ts` to composition root + domain wiring.
