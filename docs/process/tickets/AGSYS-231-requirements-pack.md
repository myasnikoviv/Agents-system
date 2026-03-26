# AGSYS-231 Requirements Pack

## Ticket
- ID: `AGSYS-231`
- Title: Runtime/Cockpit stabilization and trade_bot decoupling
- Pipeline: `bug-fix` (execution), reconciled under `sprint-integration` for closure
- Owner: PM Orchestrator + Developer

## Problem Statement
Cockpit runtime had repeated `502` failures on proxied backend endpoints, stale/hardcoded provider-model selections, OpenHands startup/health inconsistency, and UI regressions in project/chain modal rendering.

## Scope
1. Stabilize backend lifecycle so `/api/*` endpoints remain available for Vite proxy on `5174`.
2. Remove stale provider/model hardcoding and make backend runtime selection the single source of truth.
3. Persist executor/runtime settings across backend restarts.
4. Restore OpenHands health checks and startup behavior via infra scripts.
5. Fix project/chain modal rendering (must open as centered dialog overlay).

## Out of Scope
- Full migration of the whole frontend styling system to Tailwind.
- LangSmith SaaS permission/account errors unrelated to local backend health.

## Acceptance Criteria
- `http://localhost:5174/api/cockpit/catalog` returns `200` under normal runtime.
- `http://localhost:5174/api/events/stream` returns `200` and streams SSE.
- Cockpit provider/model selectors display values from backend runtime settings.
- Saving executor settings in Cockpit survives backend restart.
- OpenHands health endpoint reflects real sidecar state.
- "Add new project" and "Create new chain" open proper modal dialogs.

## Evidence Anchors (commits)
- `2e9dd0d`, `43c2892`, `7576d24`, `95a4c04`, `00d63cc`, `910bbc7`

## Approval Traceability
- Approver: Owner (chat)
- Approval status: Approved
- Approved at: 2026-03-26
