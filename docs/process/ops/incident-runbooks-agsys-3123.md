# AGSYS-3123 Incident Runbooks

## Purpose
- Provide deterministic recovery steps for common production-like incidents.

## Scenario 1: API 5xx Spike
- Detection:
  - `GET /api/cockpit/alerts` reports `failures_alert`.
  - `GET /api/cockpit/metrics/overview` shows rising `errorsTotal`.
- Recovery:
  - Check latest logs via `GET /api/cockpit/logs?level=error&source=http&limit=200`.
  - Identify failing route from `api.topRoutes` in metrics overview.
  - Restart backend process and re-run quick smoke (`/api/cockpit/metrics/overview`, `/api/cockpit/telemetry/unified`).
- Exit criteria:
  - `failures_alert` cleared.
  - 5xx trend stabilized.

## Scenario 2: Quota Pressure
- Detection:
  - `GET /api/cockpit/alerts` reports `quota_alert`.
  - `quotaUsagePct` >= 90 in alerts snapshot.
- Recovery:
  - Inspect usage via `/api/system/billing/usage/aggregate`.
  - Verify active plan + quota in `/api/workspace/billing`.
  - Throttle non-critical runs and/or upgrade plan.
- Exit criteria:
  - `quotaUsagePct` below alert threshold.

## Scenario 3: Infra Degraded (Postgres/Control Plane)
- Detection:
  - `GET /api/cockpit/alerts` reports `infra_alert`.
  - `GET /api/cockpit/runtime/postgres-status` not healthy.
- Recovery:
  - Validate DB/network connectivity.
  - Restart dependent services (`npm run infra:restart` in local env).
  - Re-check `postgres-status`, `control-plane/health`.
- Exit criteria:
  - infra alert cleared and health endpoints are green.

## Scenario 4: Runtime Traceability Gap
- Detection:
  - Missing or partial run trace in `/api/cockpit/telemetry/traces?runId=<id>`.
- Recovery:
  - Confirm request carries `x-trace-id` and `x-run-id`.
  - Check structured log stream `/api/cockpit/logs?q=traceId`.
  - Re-run minimal scenario and verify correlation (`apiSpans` + runtime events).
- Exit criteria:
  - Trace data available and correlated for the run.

## Operator Checklist
- Capture timeline: detection time, affected endpoints, recovery action, verification result.
- Save post-incident note in `docs/process/tests/<ticket>.md` with API evidence.
