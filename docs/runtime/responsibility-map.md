# Runtime Responsibility Map (AGSYS-296)

## Purpose

Define clear component ownership boundaries to remove gray zones in runtime behavior and debugging.

## Responsibility Matrix

| Component | Responsibility | Inputs | Outputs |
|---|---|---|---|
| Cockpit UI (`frontend/src/components/cockpit/CockpitPage.tsx`) | Capture user input, display filtered chat and runtime feed | User actions, API payloads, SSE events | `/api/chat` request, rendered timeline/chat |
| Backend API (`src/server/agentSystemBackend.ts`) | HTTP/SSE endpoints, persistence orchestration, runtime bootstrap | UI request, stored state, runtime results | Persisted messages/state, API response, SSE stream |
| Runtime Router (`src/runtime/graphs/RuntimeExecutionRouter.ts`) | Select and dispatch execution mode (`mock/linear/multiple_agents`) | Initial run state + execution options | Final state + applied engine |
| Pilot Graph (`src/runtime/graphs/PilotQuasiLinearGraph.ts`) | Stage-by-stage orchestration and control flow | Run context, pipeline stage definitions | Stage transitions, artifact logs, completion state |
| Agent Executor (`src/runtime/AgentExecutor.ts`) | Execute active role through adapter/tool loop | Run context, backend/model config | Structured execution result, telemetry/artifacts |
| External Execution Adapter (`src/runtime/ExternalExecutionAdapter.ts`) | Provider CLI/API invocation abstraction | Prompt, model, cwd, timeout | stdout/stderr/exit code/result envelope |
| Event Bus (`src/runtime/events/EventBus.ts`) | Emit authoritative runtime events, sync lifecycle hooks | Stage/execution events | Redis stream records, run ledger append |
| Redis Stream (`events:runtime_hub`) | Runtime event transport and replay source | EventBus `xadd` | Ordered event records for cockpit |
| SQLite Runtime DB (`.agent-system/cockpit-runtime.db`) | Persistent cockpit projects/threads/messages/settings/state | Backend writes | Restored runtime/cockpit state |
| Memory Manager (`src/runtime/MemoryManager.ts`) | Short/long-term memory namespacing and access helpers | Role/task/topic keys | Redis-backed memory records |
| Plane Lifecycle Sync (`src/runtime/PlaneLifecycleOrchestrator.ts`) | Best-effort mirror of runtime lifecycle into Plane artifacts/comments | Runtime events | Plane lifecycle updates/comments |

## No-Gray-Zone Rules

1. UI does not execute agent logic directly.
2. Runtime router is the only execution mode gateway.
3. EventBus is the only authoritative event emission boundary.
4. Provider-specific logic is isolated inside adapter layer.
5. Persistent state responsibilities are split: SQLite for cockpit state, Redis for runtime event/memory streams.

## Source Files

- `src/server/agentSystemBackend.ts`
- `src/runtime/graphs/RuntimeExecutionRouter.ts`
- `src/runtime/AgentExecutor.ts`
- `src/runtime/ExternalExecutionAdapter.ts`
- `src/runtime/events/EventBus.ts`
- `src/runtime/MemoryManager.ts`
- `src/runtime/redisClient.ts`
