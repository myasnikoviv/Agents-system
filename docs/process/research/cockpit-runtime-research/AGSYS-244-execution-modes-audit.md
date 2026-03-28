# AGSYS-244 — Execution Modes Audit (mock / quasi-linear / multiple_agents)

Date: 2026-03-28  
Scope: Research only (no implementation)

## 1) Objective
Confirm how execution modes work in practice (runtime), not by naming/UX label.

## 2) Where mode is selected and passed
- UI stores selected mode in local state and defaults to `multiple_agents`:
  - `frontend/src/components/cockpit/CockpitPage.tsx:193-197`
- UI sends mode to backend via `/api/chat` as `executionMode`:
  - `frontend/src/components/cockpit/CockpitPage.tsx:829-838`
- Backend normalizes mode to one of: `linear`, `mock`, `multiple_agents`:
  - `src/server/agentSystemBackend.ts:1284-1286`

## 3) Runtime dispatcher behavior (confirmed)
- `mock` mode uses dedicated mock path (`buildMockFinalState`).
- `linear` and `multiple_agents` both use the same engine `executeQuasiLinearRun`.
- Evidence: `src/runtime/graphs/RuntimeExecutionRouter.ts:44-64`

This means there are currently only 2 effective execution engines:
1. mock engine
2. unified pilot graph engine (used by both `linear` and `multiple_agents`)

## 4) Output behavior differences visible to user

### 4.1 Backend response shaping
In `/api/chat`, backend intentionally suppresses direct final message for `multiple_agents`:
- `finalMessage` resolves to empty string when `mode === 'multiple_agents'`.
- Evidence: `src/server/agentSystemBackend.ts:1333-1339`

### 4.2 UI rendering path
- If mode is NOT `multiple_agents`, UI appends direct `data.message` or `data.logs`.
- If mode is `multiple_agents`, UI appends dispatch placeholder:
  - `Task dispatched to Swarm... See event feed for updates.`
- Evidence: `frontend/src/components/cockpit/CockpitPage.tsx:853-878`

So practical UX split is currently:
- `mock` / `linear`: request-response style rendering in chat.
- `multiple_agents`: event-feed-driven rendering (chat starts with dispatch placeholder).

## 5) Special-case status-chain branch (confirmed)
There is explicit message-intent branch in graph:
- `isAgentStatusChainRequest` checks for phrases like “тестовий ланцюг”, “кожен агент”, “через хендоф”, plus “status/статус”.
- On match, graph emits synthetic status messages for each agent.
- Evidence:
  - matcher: `src/runtime/graphs/PilotQuasiLinearGraph.ts:124-138`
  - branch execution: `src/runtime/graphs/PilotQuasiLinearGraph.ts:339-407`

## 6) Comparison table (confirmed vs assumed)

| Mode | Engine (confirmed) | Handoff visibility path | Parallelism (confirmed) | User-visible output pattern |
|---|---|---|---|---|
| `mock` | Dedicated mock builder | None (synthetic) | No | Immediate mock message |
| `linear` | `pilot-unified-graph` | Stage events + logs/message | Not proven in this task | Direct chat response/logs |
| `multiple_agents` | `pilot-unified-graph` (same as linear) | Stage events (SSE) | Not proven in this task | Dispatch placeholder + SSE/event-driven updates |

## 7) Key findings
1. `linear` vs `multiple_agents` are not different engines today; they are different output/interaction modes on top of the same graph runtime.
2. The strongest practical difference is in response shaping and UI rendering policy.
3. Status-chain behavior is currently intent-triggered and deterministic by phrase matcher, not by general multi-agent planner logic.

## 8) Risks / ambiguities to carry into next audits
- “multiple_agents” naming may imply true parallel multi-worker semantics that are not yet verified by engine behavior.
- Event-driven and direct-response channels can both contribute to duplicated or confusing user-visible flow if not strictly separated.

## 9) Stop condition
Research artifact only. No runtime mode refactor performed.
