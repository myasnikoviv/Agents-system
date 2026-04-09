# AGSYS-2610 — Environment-Scoped Queue Model

## Scope
- Queue namespace includes environment identity
- Environment-aware pickup guarantees task isolation
- Dispatch path passes environment context
- Queue metrics can be read per environment

## Code changes
- `src/runtime/queue/ProjectDispatchQueue.ts`
- `src/runtime/graphs/MultipleAgentsRuntime.ts`
- `src/runtime/__tests__/project_dispatch_queue.test.ts`

## Automated checks
- `npx jest --runInBand src/runtime/__tests__/project_dispatch_queue.test.ts src/runtime/__tests__/dynamic_worker_spawn_manager.test.ts src/runtime/__tests__/multiple_agents_runtime.test.ts`

## Verified outcomes
- Task IDs now encode environment segment (`env-global` or specific environment)
- Worker pickup APIs accept `environmentId` and select only compatible tasks
- Snapshot/depth APIs support environment-scoped metrics
