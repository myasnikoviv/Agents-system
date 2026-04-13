# AGSYS-764 — Budget Constraints Engine (Verification)

Date: 2026-04-11
Branch: codex/agsys-3001-billing-domain-models

## Scope
- Max cost per run
- Stop execution when hard budget exceeded
- Graceful degradation when approaching budget limit

## Changes
- Added budget constraints engine in cost layer:
  - `enforceBudgetConstraints(...)` in `src/runtime/cost/CostOptimizationEngine.ts`
  - policy file support:
    - `docs/runtime/cost/budget-policy.json`
    - `defaultMaxCostUsdPerRun`
    - `defaultSoftDegradeRatio`
    - per-project overrides
- Integrated into runtime execution:
  - `src/runtime/graphs/RuntimeExecutionRouter.ts`
  - soft exceed:
    - enables graceful degrade mode (`RUNTIME_ROUTING_POLICY_MODE=cost_saver`)
    - sets constrained governance signal
  - hard exceed:
    - emits guard block event
    - stops run with budget-hard-limit error

## Evidence
1. Command:
```bash
npx jest --runInBand src/runtime/__tests__/budget_constraints_engine.test.ts src/runtime/__tests__/cost_tracking_integration.test.ts
```
Result:
- Pass (2 suites, 2 tests).

2. Verified outcomes:
- `budget_ok` state when below soft threshold
- `soft_budget_exceeded` triggers graceful degradation path
- `hard_budget_exceeded` blocks run execution
