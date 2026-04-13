# AGSYS-765 — Quality Degradation Strategy (Verification)

Date: 2026-04-11
Branch: codex/agsys-3001-billing-domain-models

## Scope
- Cheaper model fallback under budget pressure
- Shorter chains
- Fewer steps

## Changes
- Added explicit runtime degradation signal path:
  - `RuntimeExecutionRouter` sets:
    - `RUNTIME_ROUTING_POLICY_MODE=cost_saver`
    - `RUNTIME_GOVERNANCE_SIGNAL=constrained`
    - `RUNTIME_QUALITY_DEGRADATION=budget_constrained`
  - when budget soft threshold is exceeded.
- Added degraded chain behavior:
  - `MultipleAgentsRuntime` applies stricter stage cap in degraded mode (`RUNTIME_DEGRADED_MAX_STAGES`, default `6`)
  - `ChainPruningEngine` now supports `maxStagesOverride`
- This forms a complete quality degradation strategy:
  - cheaper models (routing mode)
  - shorter chains (stage cap)
  - fewer steps (pruned execution set)

## Evidence
1. Command:
```bash
npx jest --runInBand src/runtime/__tests__/quality_degradation_strategy.test.ts src/runtime/__tests__/budget_constraints_engine.test.ts
```
Result:
- Pass (2 suites, 2 tests).

2. Verified outcomes:
- constrained budget routes to cheap tier
- degraded mode enforces fewer executed stages than normal path
