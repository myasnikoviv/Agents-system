# AGSYS-3863 — Centralized Logs + Metrics + Traces Baseline

## Scope
Production baseline observability for control plane:
- structured logs with correlation IDs,
- metrics dashboard payload for availability/latency/error rate,
- alerts for readiness failures and crash loops.

## Implemented components
- Correlation and trace propagation in API middleware:
  - incoming/outgoing headers: `x-correlation-id`, `x-trace-id`, `x-span-id`
  - every HTTP structured log row includes `meta.correlationId`
- Centralized structured logs:
  - file: `docs/runtime/system/logs/structured-app.jsonl`
  - API: `GET /api/cockpit/logs`
- Metrics baseline dashboard payload:
  - API: `GET /api/cockpit/metrics/overview`
  - includes:
    - `api.baseline.availabilityPct`
    - `api.baseline.latencyMs`
    - `api.baseline.errorRatePct`
    - `services.availabilityPct`
    - service-level runtime statuses
- Alerts baseline:
  - API: `GET /api/cockpit/alerts`
  - alert codes:
    - `readiness_failures_alert`
    - `crash_loop_alert`
    - `failures_alert`
    - `infra_alert`
    - `quota_alert`

## Endpoints for operators
- `GET /api/cockpit/logs?limit=200`
- `GET /api/cockpit/metrics/overview`
- `GET /api/cockpit/telemetry/traces?runId=<runId>`
- `GET /api/cockpit/alerts`
- `GET /api/system/control-api/incidents`

## Notes
- Crash-loop signal is sourced from control-api incident timeline where remediation reason contains `restart_loop_detected`.
- This baseline is implementation-light and ready for upgrade to external stacks (Prometheus/Loki/Grafana/Tempo or managed cloud equivalents) without API contract break.
