# AGSYS-762 — Hot/Cold Workers (Verification)

Date: 2026-04-11
Branch: codex/agsys-3001-billing-domain-models

## Scope
- Frequently used workers stay hot
- Idle workers demote to cold
- Resource savings are measurable

## Changes
- Extended worker manager with explicit efficiency snapshot:
  - `DynamicWorkerSpawnManager.hotColdEfficiencySnapshot(...)`
  - returns:
    - hot/cold/idle/active counts
    - measurable savings proxy (`coldWorkerReductionUnits`, `savingsPct`)
- Reused existing lifecycle policy engine:
  - `applyIdleDemotionPolicy(...)` for hot->cold demotion and cold eviction.
- Added targeted test coverage for measurable efficiency snapshot.

## Evidence
1. Command:
```bash
npx jest --runInBand src/runtime/__tests__/dynamic_worker_spawn_manager.test.ts -t "hot/cold efficiency snapshot|demotes hot idle workers"
```
Result:
- Pass (`2` targeted tests).

2. Verified outcomes:
- hot idle workers demote to cold based on timeout policy
- efficiency snapshot exposes cold-state savings proxy and percentage
