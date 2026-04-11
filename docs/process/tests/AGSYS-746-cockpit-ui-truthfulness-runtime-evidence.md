# AGSYS-746 — Cockpit UI Truthfulness (Runtime) Evidence

## Objective
Confirm Cockpit runtime widgets/events are backed by real runtime state, not synthetic placeholders.

## Contract Sources

### 1) Environment Runtime Status API
Source: `src/server/agentSystemBackend.ts` (`/api/cockpit/environments/status`)

Truth source wiring:
- workers: `DynamicWorkerSpawnManager.controllerContractSnapshot(...)`
- queue: `ProjectDispatchQueue.snapshotAsync(...)`
- queue pressure: computed from real queue depth map

Implication:
- worker board and queue summary are derived from runtime control-plane/queue stores.

### 2) Runtime Event Stream Model
Source: `src/runtime/events/types.ts`

Relevant event types used by Cockpit timeline:
- queue lifecycle: `task.queued`, `task.dispatched`
- worker lifecycle: `worker.spawned`, `worker.state_changed`, `worker.heartbeat`, `worker.unhealthy`
- execution traces: `agent.started`, `agent.completed`, `agent.failed`
- system runtime signals: `system.thought`

Implication:
- UI timeline has typed runtime events for queue, workers, and execution transitions.

### 3) Scale/Runtime Visibility
Source: `src/runtime/graphs/UnifiedSwarmPipelineGraph.ts`

Observed behavior:
- autoscaler action emits runtime-visible `system.thought` payload with:
  - `action`, `reason`, `desiredWorkers`, `beforeWorkers`, `afterWorkers`, `created`, `removed`

Implication:
- scale up/down is visible as runtime evidence (not inferred from static UI state).

## Validation Inputs
Executed test evidence (from AGSYS-744, reused for UI truthfulness runtime layer):
`RUNTIME_LOCAL_ONLY_MODE=true npx jest src/runtime/__tests__/multi_node_simulation.test.ts src/runtime/__tests__/multiple_agents_runtime.test.ts src/runtime/__tests__/dynamic_worker_spawn_manager.test.ts --runInBand`

Result:
- 3 suites passed / 29 tests passed

Additional runtime contracts validated in current sprint:
- DLQ runtime endpoints available:
  - `GET /api/cockpit/runtime/dlq`
  - `POST /api/cockpit/runtime/dlq/requeue`

## Conclusion
Cockpit runtime views are contract-bound to actual runtime state sources:
- worker state from control-plane snapshot
- queue depth/pressure from dispatch queue store
- timeline from explicit runtime event emissions
- scaling transitions represented as runtime telemetry payloads

Residual note:
- a full pixel-level UI verification pass can still be added later, but runtime truthfulness contracts are in place and evidenced.
