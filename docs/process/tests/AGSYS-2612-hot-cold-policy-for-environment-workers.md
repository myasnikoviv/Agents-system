# AGSYS-2612 — Hot/Cold Policy for Environment Workers

## Scope
- Formalized hot/cold worker policy in runtime module
- Default policy keeps only selected orchestrator roles hot, others cold-by-default
- Cold workers still start on-demand
- Hot/cold counts visible in swarm telemetry summaries

## Code changes
- `src/runtime/workers/EnvironmentWorkerHeatPolicy.ts`
- `src/runtime/workers/DynamicWorkerSpawnManager.ts`
- `src/server/agentSystemBackend.ts`
- `src/runtime/__tests__/dynamic_worker_spawn_manager.test.ts`

## APIs
- `GET /api/cockpit/swarm/policy/hot-cold`
- Hot/cold counters added to:
  - `GET /api/cockpit/swarm/workers`
  - `GET /api/cockpit/swarm/summary`

## Tests
- `npx jest --runInBand src/runtime/__tests__/dynamic_worker_spawn_manager.test.ts src/runtime/__tests__/project_dispatch_queue.test.ts src/runtime/__tests__/multiple_agents_runtime.test.ts src/runtime/__tests__/tenant_context.test.ts src/runtime/__tests__/blackboard_tenant_scope.test.ts`
