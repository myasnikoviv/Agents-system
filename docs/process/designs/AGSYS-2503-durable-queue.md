# AGSYS-2503 — Durable Queue

## Goal
Replace in-memory dispatch queue with durable cross-process queue.

## Implemented
- Queue backend uses SQLite persistence:
  - `src/runtime/queue/ProjectDispatchQueue.ts`
  - database: `.agent-system/dispatch-queue.db`
- Queue operations implemented with persistence:
  - enqueue / pickup / pickupForWorker
  - depth / snapshot / listTasks
  - reassign / retry / cancel / setTaskPriority
- Runtime graph integration:
  - `PilotQuasiLinearGraph`
  - `MultipleAgentsRuntime`

## Durability/Cross-Process Evidence
- Unit/behavior tests: `src/runtime/__tests__/project_dispatch_queue.test.ts`
- Multi-process simulation: `src/runtime/__tests__/multi_node_simulation.test.ts`
