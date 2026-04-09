# AGSYS-2609 — Environment-Scoped Worker Pool

## Scope
- Worker pool isolation by `environmentId` inside the same project
- Queue pickup filtered by environment context
- Worker reuse blocked across mismatched environments
- Runtime dispatch carries environment scope in payload

## Code changes
- `src/runtime/workers/DynamicWorkerSpawnManager.ts`
- `src/runtime/queue/ProjectDispatchQueue.ts`
- `src/runtime/graphs/MultipleAgentsRuntime.ts`

## Automated checks
- `npx jest --runInBand src/runtime/__tests__/dynamic_worker_spawn_manager.test.ts src/runtime/__tests__/project_dispatch_queue.test.ts src/runtime/__tests__/multiple_agents_runtime.test.ts`

## Expected / verified
- Distinct worker records are maintained for same `(projectId, agentSlug)` across different environments
- Queue task for `environmentId=A` is not picked by worker requesting `environmentId=B`
- Multiple-agents runtime stamps task payload with `environmentId` and validates mismatch before execution
