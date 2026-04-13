# AGSYS-757 — Step Deduplication (Verification)

Date: 2026-04-11
Branch: codex/agsys-3001-billing-domain-models

## Scope
- Eliminate duplicate step executions
- Reuse results for matching steps

## Changes
- Added dedup key engine:
  - `src/runtime/optimization/StepDedupEngine.ts`
  - produces deterministic dedup fingerprint per pipeline/agent/stage-signature/user-input
  - supports policy toggle via `docs/runtime/adaptive/chain-optimization-policy.json` (`enabled`)
- Integrated into runtime execution:
  - `src/runtime/graphs/MultipleAgentsRuntime.ts`
  - duplicate matching step no longer executes worker/tool loop
  - cached result is reused and emitted as `agent.completed` with `outcome: reused`

## Evidence
1. Command:
```bash
npx jest --runInBand src/runtime/__tests__/step_dedup_engine.test.ts src/runtime/__tests__/chain_pruning_engine.test.ts
```
Result:
- Pass (2 suites, 3 tests).

2. Verified behavior:
- same semantic step -> same dedup key
- disabled policy -> no dedup key
- duplicate steps reuse prior result instead of re-executing full stage
