# AGSYS-756 — Chain Pruning (Verification)

Date: 2026-04-11
Branch: codex/agsys-3001-billing-domain-models

## Scope
- Reduce redundant chain steps
- Fewer LLM calls
- Measurable optimization evidence

## Changes
- Added chain pruning engine:
  - `src/runtime/optimization/ChainPruningEngine.ts`
  - policy file support: `docs/runtime/adaptive/chain-optimization-policy.json`
  - rules:
    - `dedupeByStageId`
    - `dedupeConsecutiveByAgent`
    - `dropDisabledStages`
    - `maxStagesPerRun`
- Integrated pruning in runtime:
  - `src/runtime/graphs/MultipleAgentsRuntime.ts`
  - pruning is applied before stage execution
  - report is generated to `docs/process/runs/optimization/<runId>.chain-pruning.json`
  - runtime event includes pruning summary (`before/after/pruned/improvement%`)

## Evidence
1. Command:
```bash
npx jest --runInBand src/runtime/__tests__/chain_pruning_engine.test.ts src/runtime/__tests__/routing_policies.test.ts
```
Result:
- Pass (2/2 suites, 2/2 tests).

2. Measurable improvement validation:
- In test scenario:
  - before: 6 stages
  - after: 3 stages
  - pruned: 3 stages
  - estimated LLM-call reduction: 50%
