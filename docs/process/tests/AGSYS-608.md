# Test Report — AGSYS-608

- Ticket: AGSYS-608
- Date: 2026-04-09
- Branch: codex/s19-runtime-remediation

## Scope Under Test
Shared queue async path introduction and multiple-agents runtime wiring.

## Commands
1. `npx jest --runInBand src/runtime/__tests__/project_dispatch_queue.test.ts src/runtime/__tests__/multiple_agents_runtime.test.ts`
2. `npm run test:scenarios`

## Results
- Queue/runtime targeted tests: PASS (2 suites, 14 tests).
- Scenarios regression pack: PASS (3 suites, 10 tests).
- Worker/runtime targeted tests after shared-state slice: PASS (`dynamic_worker_spawn_manager` + `multiple_agents_runtime`, 18 tests total).
- Queue async control regression after cockpit alignment: PASS (`project_dispatch_queue` + `multiple_agents_runtime`, 15 tests total).
- Distributed lock hardening regression: PASS (`dynamic_worker_spawn_manager` + `multiple_agents_runtime`) and `test:scenarios`.
- Shared-backend flag validation: PASS with
  `RUNTIME_SHARED_DISPATCH_QUEUE_BACKEND=redis`
  and `RUNTIME_SHARED_WORKER_STATE_BACKEND=redis`
  on queue/worker/runtime suites (3 suites, 28 tests).

## Notes
- Async queue test added for sqlite fallback compatibility path.
- Redis backend mode is feature-flagged by env and is backward-compatible when disabled.
- Added `DynamicWorkerSpawnManager.clearAsync()` and updated worker tests to avoid shared-state residue between runs in redis mode.
