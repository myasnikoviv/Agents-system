# AGSYS-753 — Cost Tracking Integration (Verification)

Date: 2026-04-11
Branch: codex/agsys-3001-billing-domain-models

## Scope
- Runtime + billing-aligned cost tracking integration:
- each run has explicit cost metrics
- step-level cost visibility
- cost aggregation across runs/projects

## Evidence
1. Command:
```bash
npx jest --runInBand src/runtime/__tests__/cost_optimization_layer.test.ts src/runtime/__tests__/cost_tracking_integration.test.ts
```
Result:
- Pass (2/2 suites, 2/2 tests).

2. `collectRunCostMetrics` integration outcomes:
- run-level totals:
  - `tokens`
  - `toolExecutions`
  - `runtimeSeconds`
  - `monetary.totalCostUsd`
- step-level:
  - `attribution.byStep`
  - `monetary.byStepUsd`
- usage-event integration:
  - `usage.token_usage`
  - `usage.tool_execution`
  - `usage.runtime_time`
  - fallback to runtime ledger events when usage events are absent

3. Aggregation support:
- Added `aggregateCostLedgers(workspacePath, { projectId? })`:
  - total runs
  - total token/tool/runtime usage
  - total USD cost
  - grouped rollup by project
