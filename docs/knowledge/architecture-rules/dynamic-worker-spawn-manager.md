# Dynamic Worker Spawn Manager (Sprint 19)

## Rule
Workers must be allocated lazily by `(projectId, agentSlug)` at stage execution time.

## Contract
- `ensureWorker(runId, projectId, chainId, agentSlug)` returns `{ worker, spawned }`.
- Worker identity uses project-scoped contract (`projectId + agentSlug + workerId`).
- Worker state returns to `standby` after stage completion.

## Telemetry
- `worker.starting`
- `worker.spawned`
- `worker.reused`
- `worker.failed`

## Guarantee
No eager spawn of full project agent set during intake or project switch.
