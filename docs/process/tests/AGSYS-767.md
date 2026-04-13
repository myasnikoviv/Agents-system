# AGSYS-767 — Cost UI (Verification)

Date: 2026-04-11
Branch: codex/agsys-3001-billing-domain-models

## Scope
- Product-level Cost UI in Cockpit
- Cost graph for recent runs
- Cost breakdown + insights (top run / top agent / top workspace)
- Integrate UI with Cost Breakdown API (`/api/system/billing/cost/breakdown`)

## Changes
- Updated `ObservabilityPanels`:
  - added API integration with project-aware filtering (`projectId`, `limit`)
  - added Cost Intelligence section with:
    - recent run cost bars
    - total USD + token totals
    - top run / top agent / top workspace insights
  - graceful empty/loading/error states
- Updated `CockpitPage` to pass active project into Cost UI panel.
- Fixed existing TS build blockers (unused imports/state setters) to keep frontend build green.

## Evidence
1. Command:
```bash
npm --prefix frontend run build
```
Result:
- Pass (TypeScript + Vite production build).

2. Verified outcomes:
- Cost UI reads data from backend breakdown endpoint, not only from chat-event heuristics.
- User-facing cost insights are presented in readable UI form (graph + breakdown + insights).
