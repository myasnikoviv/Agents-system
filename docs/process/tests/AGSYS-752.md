# AGSYS-752 — Cost Model Definition (Verification)

Date: 2026-04-11
Branch: codex/agsys-3001-billing-domain-models

## Scope
- Unified cost model with explicit dimensions:
- cost per token
- cost per tool execution
- cost per runtime time
- normalized output format in `RunCostMetrics.monetary`

## Evidence
1. Command:
```bash
npm test -- src/runtime/__tests__/cost_optimization_layer.test.ts --runInBand
```
Result:
- Pass.
- `collectRunCostMetrics` now validates `monetary` payload:
- `currency`
- `rates` (`per1kTokensUsd`, `perToolExecutionUsd`, `perRuntimeSecondUsd`)
- `tokenCostUsd`, `toolCostUsd`, `runtimeCostUsd`, `totalCostUsd`
- `byAgentUsd`, `byStepUsd`, `breakdownUsd`

2. Command:
```bash
npx tsx src/runtime/__tests__/sprint9_cost_optimization.test.ts
```
Result:
- Pass.
- Legacy sprint-9 cost optimization expectations preserved.

## Notes
- Backward compatibility preserved for existing token-based logic (`tokens`, `breakdown`, `attribution`).
- Usage-event aware aggregation is added:
- `usage.token_usage`
- `usage.tool_execution`
- `usage.runtime_time`
