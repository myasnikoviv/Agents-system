# [AGSYS-231] Runtime/Cockpit Stabilization After Decoupling

## Context / Problem
After decoupling from `trade_bot`, Cockpit runtime had repeated instability:
- recurring `502` on proxied endpoints (`/api/cockpit/*`, `/api/events/stream`),
- stale runtime provider/model in UI,
- non-persistent executor/runtime config after backend restart,
- OpenHands health/startup inconsistency,
- modal rendering regressions for new project/chain flows.

## Scope
- stabilize backend lifecycle and proxy availability (`3001` behind `5174`),
- enforce backend runtime provider/model as single source of truth,
- persist executor settings and rehydrate on startup,
- wire real OpenHands health checks and startup paths,
- fix project/chain modal UX rendering.

## Acceptance Criteria
- [x] `5174` cockpit endpoints return stable responses without backend crash loops.
- [x] `/api/events/stream` works via proxy.
- [x] provider/model in cockpit reflect saved runtime settings.
- [x] OpenHands health reflects real sidecar status.
- [x] project/chain creation opens proper modal dialogs.

## Pipeline
- Primary execution pipeline: `bug-fix`
- Closure/reconciliation pipeline: `sprint-integration`

## Artifacts
- Requirements pack: `docs/process/tickets/AGSYS-231-requirements-pack.md`
- Assumptions review: `docs/process/tickets/AGSYS-231-assumptions-review.md`
- Pipeline state: `docs/process/pm/pipeline-state/AGSYS-231.md`
- Test report: `docs/process/tests/AGSYS-231.md`
- Run report: `docs/process/runs/AGSYS-231.md`

## Gate
PM-Orchestrator
