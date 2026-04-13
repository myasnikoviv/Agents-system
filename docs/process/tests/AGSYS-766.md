# AGSYS-766 — Cost Breakdown API (Verification)

Date: 2026-04-11
Branch: codex/agsys-3001-billing-domain-models

## Scope
- Expose cost breakdown via API
- Aggregate cost ledgers per run / per agent / per workspace
- Support optional filters (`runId`, `projectId`, `workspaceId`, `limit`)

## Changes
- Added `CostBreakdownService`:
  - reads run cost ledgers from `docs/process/runs/cost`
  - builds normalized breakdown sections:
    - `perRun`
    - `perAgent`
    - `perWorkspace`
- Added API route:
  - `GET /api/system/billing/cost/breakdown`
  - response shape: `{ success: true, breakdown }`
- Added tests to validate aggregation and filtering behavior.

## Evidence
1. Command:
```bash
npx jest --runInBand src/runtime/__tests__/cost_breakdown_service.test.ts src/runtime/__tests__/budget_constraints_engine.test.ts
```
Result:
- Pass (2 suites, 2 tests).

2. Verified outcomes:
- Cost breakdown is aggregated correctly across run/agent/workspace levels.
- API endpoint returns stable machine-readable payload for billing UI/reporting integration.
