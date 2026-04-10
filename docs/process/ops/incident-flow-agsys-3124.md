# AGSYS-3124 Incident Flow

## Detection
- Alert-driven: `/api/cockpit/alerts`.
- Metric-driven: `/api/cockpit/metrics/overview`.
- Log-driven: `/api/cockpit/logs`.
- Manual operator report.

## Escalation
- Classify severity (`low`, `medium`, `high`).
- Assign incident owner/on-call.
- Open/attach incident ticket in Plane.
- Notify channels: `in_app`, `audit_log`.

## Resolution
- Execute matching runbook from incident runbooks catalog.
- Re-check health/alerts/metrics.
- Capture evidence and post-incident summary.

## API Contract
- `GET /api/cockpit/incidents/flow` returns the runtime-defined flow stages for cockpit.
