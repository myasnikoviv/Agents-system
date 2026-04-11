# AGSYS-744 — Multi-Node Parallel Execution Evidence Pack

## Scope
Evidence for Sprint 32.1 requirement:
- 2+ node execution with shared queue/worker state
- factual parallel overlap in multiple-agents runtime
- crash/dead-worker detection and recovery behavior under runtime pressure

## Test Run
Date: 2026-04-11
Command:
`RUNTIME_LOCAL_ONLY_MODE=true npx jest src/runtime/__tests__/multi_node_simulation.test.ts src/runtime/__tests__/multiple_agents_runtime.test.ts src/runtime/__tests__/dynamic_worker_spawn_manager.test.ts --runInBand`

Result:
- Test Suites: 3 passed, 3 total
- Tests: 29 passed, 29 total

## Evidence 1 — Cross-process (multi-node simulation)
Source: `src/runtime/__tests__/multi_node_simulation.test.ts`

Confirmed:
- queue state is visible across independent processes (`ProjectDispatchQueue` cross-process pickup)
- worker pool state is visible across independent processes (`DynamicWorkerSpawnManager` snapshot cross-process)

Implication:
- runtime truth is not limited to single in-memory process state for these paths.

## Evidence 2 — Parallel overlap (not pseudo-linear)
Source: `src/runtime/__tests__/multiple_agents_runtime.test.ts`
Test: `shows factual overlap for parallel stage execution`

Confirmed:
- with `RUNTIME_MULTIPLE_AGENTS_PARALLELISM=2`, measured `maxInFlight >= 2`
- this proves real execution overlap of stage workers

Implication:
- parallel runtime is factual (not just UI-linearized sequence).

## Evidence 3 — Failure detection + recovery
Source: `src/runtime/__tests__/dynamic_worker_spawn_manager.test.ts`
Test: `auto-recovers dead workers based on heartbeat health snapshot`

Confirmed:
- dead worker state is detected by heartbeat age
- recovery loop attempts restart/replace and returns to healthy pool state

Implication:
- crash/dead-worker fault path has deterministic recovery behavior.

## Residual Notes
- this pack validates runtime mechanics and overlap at test level
- dedicated production-load benchmark remains tracked under AGSYS-745
