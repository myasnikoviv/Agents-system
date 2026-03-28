# AGSYS-253 — Live Process Visibility Audit

Date: 2026-03-28  
Scope: Research only (no implementation)

## 1) What is currently visible (confirmed)

### Runtime stream channel
- UI subscribes to SSE endpoint `/api/events/stream`.
- Evidence:
  - backend endpoint: `src/server/agentSystemBackend.ts:1394-1425`
  - frontend EventSource wiring: `frontend/src/components/cockpit/CockpitPage.tsx:448-455`

### Runtime board updates
- Incoming events update per-agent runtime card status/stage/task/thread.
- Status mapping based on event type:
  - `stage.started/tool.called` -> active
  - `swarm_stage_completed/run.completed` -> standby
  - failures -> unavailable
- Evidence: `frontend/src/components/cockpit/CockpitPage.tsx:466-517`

### Chat propagation of process events
- Certain runtime events are transformed to chat messages:
  - stage start
  - stage complete message
  - tool called summary
  - contract guard events
- Evidence: `frontend/src/components/cockpit/CockpitPage.tsx:529-553`, `572-579`

## 2) Gaps vs codex-like target process visibility
1. Dual-channel ambiguity:
- process events and assistant answer can both appear as chat messages; user may not distinguish control-plane vs answer-plane.

2. Inconsistent finality semantics:
- `run.completed` marks UI completion but final assistant message authority can still come from multiple paths.

3. No explicit timeline grouping by run:
- run-level grouping is implicit; messages/events are thread-bound and can interleave.

## 3) Event-stream to chat mapping assessment
- Current mapping is rich but noisy for end-users; some technical events (`contract_*`) leak directly into primary chat.

## 4) Initial gap list
1. Missing “single source of truth” for final answer rendering.
2. Missing run timeline panel separate from conversation stream.
3. Missing strict separation of user-facing vs diagnostic events.

## 5) Recommended audit follow-ups (research scope)
1. Define message classes:
- `user-visible answer`
- `process milestone`
- `diagnostic technical`

2. Add run timeline model for event grouping by `runId`.

3. Define authoritative completion event + authoritative final message source.

## 6) Stop condition
Research artifact only. No UI visibility refactor implemented.
