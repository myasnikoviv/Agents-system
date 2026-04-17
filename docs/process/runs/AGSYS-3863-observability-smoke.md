# AGSYS-3863 — Observability Baseline Smoke

## Date
2026-04-17

## Validation commands
```bash
npx tsc -p apps/control-api/tsconfig.json --noEmit
npx jest --runInBand --roots packages/runtime/src/__tests__ --runTestsByPath \
  packages/runtime/src/__tests__/restart_policy_engine.test.ts \
  packages/runtime/src/__tests__/control_api_runtime_manager.test.ts
```

## Additional attempted check (known pre-existing issue)
```bash
npx jest --runInBand --roots packages/runtime/src/__tests__ --runTestsByPath \
  packages/runtime/src/__tests__/telemetry_metrics_overview.test.ts \
  packages/runtime/src/__tests__/telemetry_tracing_endpoint.test.ts \
  packages/runtime/src/__tests__/telemetry_alerts_endpoint.test.ts
```

## Result
- Control API typecheck: passed.
- Runtime/control-api safety tests: `2 passed, 2 total` (`7 passed, 7 total`).
- Telemetry endpoint test trio currently fails in this repo due pre-existing broken import path `../../server/routes/telemetryRoutes` (module not found). Not introduced by AGSYS-3863 patch.

## Manual operator checks
1. Start services.
2. `GET /api/cockpit/metrics/overview` includes `api.baseline` and `services.availabilityPct`.
3. `GET /api/cockpit/alerts` returns readiness/crash-loop alerts when failure conditions are present.
4. `GET /api/cockpit/logs` rows include `meta.correlationId`.
