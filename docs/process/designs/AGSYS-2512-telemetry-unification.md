# AGSYS-2512 — Telemetry Unification

## Goal
Provide a unified telemetry plane where runtime events and control/audit logs are consumable through a single normalized contract and produce traceable execution views.

## Implemented
- Added normalized telemetry model in backend with event unification across:
  - runtime events (Redis stream / run ledger)
  - control action audit logs (`control-actions.jsonl`)
- Added unified endpoints:
  - `GET /api/cockpit/telemetry/unified`
  - `GET /api/cockpit/telemetry/runs/:runId/trace`
  - `GET /api/cockpit/audit/logs`
- Retained existing endpoint compatibility:
  - `GET /api/cockpit/control-actions` now uses shared audit reader.

## Unified Contract
Each telemetry row includes:
- `source` (`runtime|audit`)
- `category` (`run|agent|tool|guard|governance|worker|queue|control|other`)
- `type`
- `timestamp` + `isoTime`
- optional execution identity (`runId`, `projectId`, `chainId`, actor)
- structured `payload`

## Traceability
`/api/cockpit/telemetry/runs/:runId/trace` provides:
- start/finish/duration
- stage progression (`agent.started/completed/handoff`)
- tool timeline (`tool.call/result`)
- governance/guard timeline
