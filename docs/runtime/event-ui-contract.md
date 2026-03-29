# Event -> UI Mapping Spec (AGSYS-297)

## Purpose

Define deterministic rendering contract for cockpit runtime events:

- each `event.type` has one canonical UI projection target,
- one event renders one UI block,
- no hidden implicit transforms.

## Canonical Mapping

| Event Type | Source | UI Target | Render Rules |
|---|---|---|---|
| `run.started` | Runtime orchestrator | Timeline feed | system timeline item, no chat bubble |
| `run.completed` | Runtime orchestrator | Timeline feed | completion status item |
| `run.failed` | Runtime orchestrator | Timeline feed | error item with short human summary |
| `stage.started` | Graph engine | Timeline feed | stage badge + role |
| `stage.completed` | Graph engine | Timeline feed | stage result item |
| `swarm.handoff` | Graph engine | Timeline feed + swarm board | source -> target role transition |
| `agent.message` | Agent executor | Main chat | regular assistant message block |
| `agent.thought` | Agent executor | Timeline feed | hidden from main chat; visible in telemetry pane |
| `tool.call` | Tooling layer | Timeline feed + tool panel | includes tool name, args summary |
| `tool.result` | Tooling layer | Timeline feed + tool panel | includes status + short output summary |
| `guard.flagged` | Contract guard | Timeline feed | warning item, never rendered as user-facing answer |
| `guard.passed` | Contract guard | Timeline feed | informational item |
| `provider.error` | Provider adapter | Timeline feed + error banner | concise normalized provider error |
| `memory.read` | Memory manager | Timeline feed (debug mode) | optional, not in chat stream |
| `memory.write` | Memory manager | Timeline feed (debug mode) | optional, not in chat stream |

## Deterministic Rules

1. Renderer must dispatch by exact `event.type` key.
2. Unknown event types go to `timeline/unknown` bucket with raw payload excerpt.
3. Chat surface only accepts `agent.message` and user-authored messages.
4. Event re-interpretation by UI is forbidden; backend publishes final semantic type.
5. Every rendered block preserves `eventId`, `runId`, and `timestamp` for traceability.

## Acceptance Mapping (`PM-S0.5-4`)

- each event has UI mapping -> table above is exhaustive for known runtime events.
- 1 event = 1 UI block -> deterministic rules #1 and #3.
