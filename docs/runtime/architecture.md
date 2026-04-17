# Runtime Architecture Diagram (AGSYS-294)

## Purpose

This artifact defines the end-to-end runtime path used by Agent Cockpit:

`UI -> API -> Runtime Orchestrator -> Agent/Provider Execution -> Event Bus -> Storage -> UI`

It is a reference contract for Sprint 0.5 (`PM-S0.5-1`).

## End-to-End Diagram

```mermaid
flowchart TD
  U[User] --> F[Frontend Cockpit\nfrontend/src/components/cockpit/CockpitPage.tsx]
  F -->|HTTP /api/chat| B[Backend API\nsrc/server/agentSystemBackend.ts]
  F -->|SSE /api/events/stream| B

  B --> R[Runtime Router\nsrc/runtime/graphs/RuntimeExecutionRouter.ts]
  R --> Q[Pilot Graph Engine\nsrc/runtime/graphs/PilotQuasiLinearGraph.ts]
  Q --> E[Agent Executor\nsrc/runtime/AgentExecutor.ts]

  E --> A1[Codex CLI Adapter]
  E --> A2[OpenHands Adapter]
  E --> A3[Claude CLI Adapter]
  E --> A4[LangChain / Gemini Adapters]

  E --> EV[Event Bus\nsrc/runtime/events/EventBus.ts]
  EV --> REDIS[(Redis Stream\nevents:runtime_hub)]
  EV --> RL[Run Ledger\nsrc/runtime/RunLedger.ts]
  EV --> PL[Plane Lifecycle Sync\nsrc/runtime/PlaneLifecycleOrchestrator.ts]

  B --> PG[(Postgres\ncontrol/runtime state)]
  E --> MM[Memory Manager\nsrc/runtime/MemoryManager.ts]
  MM --> REDIS

  REDIS --> B
  PG --> B
  B --> F
```

## Contracted Component Boundaries

1. Frontend does not directly execute agents or providers.
2. Backend API is the control plane for runtime start/cancel/state access.
3. `RuntimeExecutionRouter` is the single mode dispatcher (`mock`, `linear`, `multiple_agents`).
4. `AgentExecutor` is the provider abstraction boundary.
5. Event stream is authoritative for runtime progression (`EventBus` + Redis stream).
6. Persistent cockpit/runtime state is Postgres-first; Redis is the runtime stream/memory backbone.

## Primary Source Files

- `src/server/agentSystemBackend.ts`
- `src/runtime/graphs/RuntimeExecutionRouter.ts`
- `src/runtime/AgentExecutor.ts`
- `src/runtime/events/EventBus.ts`
- `src/runtime/MemoryManager.ts`
- `src/runtime/redisClient.ts`
- `frontend/src/components/cockpit/CockpitPage.tsx`

## Acceptance Mapping (`PM-S0.5-1`)

- `diagram exists` -> this file (`architecture.md`) contains a complete mermaid diagram.
- `covers all components` -> includes UI/API/runtime/agents/providers/events/storage.
- `used as reference` -> path is stable under `docs/runtime/` for downstream sprint tickets.
