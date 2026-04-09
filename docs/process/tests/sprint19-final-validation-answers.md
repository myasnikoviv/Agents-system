# Sprint 19 Questions — Compliance Matrix

Date: 2026-04-08
Source: `docs/sprints/sprint_19_questions.md`

## Verdict
PASS (implemented to target for Sprint 19 runtime scope).

## Section Status
- Section 1: Pass
  - 1.1 workers execute stage code out-of-process (`worker_run_once` subprocess transport in `multiple_agents`).
  - 1.2 mode separation: pass (`linear`/`multiple_agents` use different execution backend path).
  - 1.3 project isolation: pass.
- Section 2: Pass.
- Section 3: Pass.
- Section 4: Pass (parallel overlap evidence present in ledger).
- Section 5: Pass.
- Section 6: Pass.
- Section 7: Pass (project switch cleanup/isolation policy + tests).
- Section 8: Pass.
- Section 9: Pass.
- Section 10: Pass
  - 10.1 worker crash handling: pass (`markFailed` + failed->cold->starting->hot->active recovery path).
  - 10.2 task recovery semantics: pass (queue-level retry/reassign with `retryCount`, `retryOfTaskId`, re-enqueue + redispatch).

## New Evidence (this pass)
- Code:
  - `src/runtime/workers/worker_run_once.ts`
  - `src/runtime/workers/WorkerProcessExecutor.ts`
  - `src/runtime/graphs/PilotQuasiLinearGraph.ts`
  - `src/runtime/workers/DynamicWorkerSpawnManager.ts`
- Tests:
  - `npx jest --runInBand src/runtime/__tests__/dynamic_worker_spawn_manager.test.ts src/runtime/__tests__/project_switch_runtime_policy.test.ts src/runtime/__tests__/worker_lifecycle_state_machine.test.ts`
  - Result: 3 suites passed, 11 tests passed.
- Added test: `recovers failed worker to active on next ensure`.
