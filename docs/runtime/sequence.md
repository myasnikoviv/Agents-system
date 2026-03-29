# Runtime Sequence Flow (AGSYS-295)

## Purpose

This document defines the ordered lifecycle of a single runtime run from user input to completion and UI projection.

It is the sequence contract artifact for Sprint 0.5 (`PM-S0.5-2`).

## Sequence Diagram

```mermaid
sequenceDiagram
  autonumber
  participant U as User
  participant UI as Cockpit UI
  participant API as Backend API
  participant RR as RuntimeExecutionRouter
  participant G as Pilot Graph
  participant AE as AgentExecutor
  participant EX as External Adapter
  participant EB as EventBus
  participant RS as Redis Stream
  participant DB as SQLite Store

  U->>UI: Submit message
  UI->>API: POST /api/chat
  API->>DB: Persist user message
  API->>RR: executeRuntimeRun(initialState)
  RR->>G: executeQuasiLinearRun(...)
  G->>EB: emit run.started
  EB->>RS: xadd(events:runtime_hub)

  G->>AE: run(context)
  AE->>EX: execute(prompt, model, tools)
  EX-->>AE: structured result
  AE->>EB: emit llm.request / llm.response / agent.message
  EB->>RS: append events

  G->>EB: emit stage.started / stage.completed / swarm.handoff (when applicable)
  EB->>RS: append events

  G->>EB: emit run.completed
  EB->>RS: append events
  G-->>API: finalState + artifactLogs
  API->>DB: Persist assistant message and runtime state
  API-->>UI: Response payload

  UI->>API: GET /api/events/stream (SSE)
  API->>RS: fetchRecentEvents / stream
  API-->>UI: ordered runtime events
```

## Lifecycle Guarantees

1. A run starts with a new user input and has its own `runId`.
2. Core event emissions are ordered and timestamped.
3. Agent/provider execution is wrapped behind `AgentExecutor`.
4. Final UI state is a projection of persisted messages and runtime events.

## Source Files

- `src/server/agentSystemBackend.ts`
- `src/runtime/graphs/RuntimeExecutionRouter.ts`
- `src/runtime/graphs/PilotQuasiLinearGraph.ts`
- `src/runtime/AgentExecutor.ts`
- `src/runtime/ExternalExecutionAdapter.ts`
- `src/runtime/events/EventBus.ts`
