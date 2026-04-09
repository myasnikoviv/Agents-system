# AGSYS-2611 — Environment-Scoped Memory & Artifact Boundaries

## Scope
- Memory namespace includes tenant/workspace/project/environment
- Blackboard keys (facts/decisions/artifacts/handoff) include environment dimension
- Runtime context propagates `environmentId` into tenancy scope
- Swarm telemetry endpoints support environment filtering

## Code changes
- `src/runtime/tenancy/TenantContext.ts`
- `src/runtime/context/RunContext.ts`
- `src/runtime/BlackboardService.ts`
- `src/runtime/MemoryManager.ts`
- `src/server/agentSystemBackend.ts`

## Tests
- `npx jest --runInBand src/runtime/__tests__/tenant_context.test.ts src/runtime/__tests__/blackboard_tenant_scope.test.ts src/runtime/__tests__/tenant_isolation_e2e.test.ts src/runtime/__tests__/project_dispatch_queue.test.ts src/runtime/__tests__/dynamic_worker_spawn_manager.test.ts src/runtime/__tests__/multiple_agents_runtime.test.ts`

## Verified outcomes
- No fact leakage between environments under same tenant/workspace/project
- Queue/worker telemetry can be queried per environment scope
- Memory key pattern now encodes environment identity by default
