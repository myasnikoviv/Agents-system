# AGSYS-3121 SLO Definition

## Scope
- Backend API runtime (cockpit + system endpoints).
- Multi-agent run execution lifecycle.

## SLO Targets
- Uptime (availability): `>= 99.9%` monthly.
- API latency: `p95 <= 1200ms` for non-streaming endpoints.
- Success rate: `>= 99.0%` successful requests (HTTP `< 500`).

## Measurement
- Source: runtime API metrics overview endpoint.
- Endpoint: `GET /api/cockpit/sre/slo`.
- Window: rolling in-memory runtime window (current node lifecycle).

## Notes
- This is MVP SLO tracking for local/standalone operation.
- For production, move windows + rollups to durable TSDB and alerting pipeline.
