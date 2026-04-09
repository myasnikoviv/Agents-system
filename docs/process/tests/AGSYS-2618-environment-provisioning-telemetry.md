# AGSYS-2618 — Environment Provisioning Telemetry

## Scope
- Capture lifecycle traces for provision/warmup/suspend/resume
- Expose cold-start latency metric
- Expose failure reasons and auditable event list

## API
- `GET /api/cockpit/environments/telemetry?projectId=<id>&limit=<n>`

## Verification
- Executed provision + warmup for `projectId=sprint26-smoke`
- Queried telemetry endpoint with auth token
- Observed:
  - `traces[]` populated
  - `metrics.coldStartLatencyMs` populated
  - `metrics.failureCount` present
  - `failures[]` available for auditable reasons
