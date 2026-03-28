# AGSYS-252 — Context Carryover / Stuck-State Audit

Date: 2026-03-28  
Scope: Research only (no implementation)

## 1) Observed carryover-sensitive areas

1. Contract reprompt mutates thread history in-memory context
- On contract fail, previous assistant output + reprompt instruction are appended into `threadHistory` for retry.
- Evidence: `src/runtime/graphs/PilotQuasiLinearGraph.ts:609-617`
- Risk: if not isolated by run/thread correctly, semantic residue can influence next stage response style.

2. Multi-channel response propagation
- Backend `/api/chat` can return message/logs while SSE simultaneously propagates stage events/messages.
- Evidence:
  - backend shaping: `src/server/agentSystemBackend.ts:1312-1353`
  - UI event-to-chat propagation: `frontend/src/components/cockpit/CockpitPage.tsx:522-579`
- Risk: duplicated/shifted outputs that appear like stale answer reuse.

3. Awaiting-reply state transitions
- `isAwaitingAgentReply` toggled by direct response and also by `run.completed` SSE events.
- Evidence: `frontend/src/components/cockpit/CockpitPage.tsx:826`, `855-867`, `555-557`
- Risk: race between HTTP result and SSE completion may produce perceived stuck/early-stop behavior.

## 2) Reproduction scenarios (for formal test plan)
1. Contract-fail then immediate next user question:
- send message likely to trigger contract guard,
- send second unrelated message quickly,
- verify response maps to second prompt only.

2. Multiple-agents dispatch + page reload mid-run:
- verify post-reload event consumption does not replay stale stage messages as new answer.

3. HTTP success + SSE stage-completed overlap:
- verify chat receives one canonical final answer, not duplicate variant.

## 3) Root-cause hypotheses
1. Competing authoritative channels (HTTP final payload vs SSE stage payload).
2. Event ordering and dedupe window mismatch by `event_id`/thread key.
3. Contract reprompt context append bleeding into adjacent stage/user turn under timing pressure.

## 4) Evidence anchors
- Contract reprompt memory append: `src/runtime/graphs/PilotQuasiLinearGraph.ts:609-617`
- Event-to-chat propagation and dedupe set: `frontend/src/components/cockpit/CockpitPage.tsx:521-579`
- Final message shaping in backend: `src/server/agentSystemBackend.ts:1333-1353`

## 5) Stop condition
Research artifact only. No carryover fix implementation performed.
