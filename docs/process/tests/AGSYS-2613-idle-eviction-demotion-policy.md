# AGSYS-2613 — Idle Eviction / Demotion Policy

## Scope
- Configurable idle demotion from hot to cold workers
- Configurable idle eviction of cold workers
- Deterministic policy execution order
- Pressure reduction is measurable via before/after counters

## Code changes
- `src/runtime/workers/DynamicWorkerSpawnManager.ts`
- `src/server/agentSystemBackend.ts`
- `src/runtime/__tests__/dynamic_worker_spawn_manager.test.ts`

## Policy controls
- `RUNTIME_HOT_DEMOTION_IDLE_TIMEOUT_MS`
- `RUNTIME_WORKER_IDLE_TIMEOUT_MS`

## Runtime visibility
- `GET /api/cockpit/swarm/workers` summary now includes `policyStats`
- `GET /api/cockpit/swarm/summary` summary now includes `policyStats`

## Tests
- `npx jest --runInBand src/runtime/__tests__/dynamic_worker_spawn_manager.test.ts src/runtime/__tests__/project_dispatch_queue.test.ts src/runtime/__tests__/multiple_agents_runtime.test.ts`
