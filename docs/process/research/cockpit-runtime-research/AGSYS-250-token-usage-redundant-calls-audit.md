# AGSYS-250 — Token Usage & Redundant Calls Audit

Date: 2026-03-28  
Scope: Research only (no implementation)

## 1) Findings: primary token/call cost drivers

### Driver A — Router LLM classification call before main execution
- `routerNode` uses `classifyRequest(...)` (which may invoke Gemini/OpenAI classification call).
- Evidence:
  - router callsite: `src/runtime/graphs/PilotQuasiLinearGraph.ts:284-307`
  - classifier LLM path: `src/runtime/IntakeClassifier.ts:235-330`
- Impact: one extra model call per user message when fast rules/explicit directives do not short-circuit.

### Driver B — Contract guard reprompt path
- If response violates contract, system performs one additional executor call.
- Evidence: `src/runtime/graphs/PilotQuasiLinearGraph.ts:567-623`
- Impact: duplicate full-stage model cost (up to ~2x stage cost).

### Driver C — Stage-level execution even for simple intents
- PM-entry insertion and stage-by-stage graph execution can add overhead for lightweight questions.
- Evidence: `src/runtime/graphs/PilotQuasiLinearGraph.ts:440-470`

### Driver D — Multi-channel output shaping + event chatter
- Runtime emits event logs plus chat payload shaping; UI may process both pathways.
- Evidence:
  - event emit path: `src/runtime/events/EventBus.ts:28-55`
  - `/api/chat` output shaping: `src/server/agentSystemBackend.ts:1312-1353`
- Impact: not direct token cost, but can trigger duplicate retries/confusion loops that indirectly increase calls.

## 2) Confirmed expensive loop patterns
1. Classification + execution as serial pair for each message.
2. Contract fail -> reprompt -> fallback formatting path.
3. Reclassification checkpoint path can reroute additional stages.
- Evidence: drift reroute branch `src/runtime/graphs/PilotQuasiLinearGraph.ts:672-690`

## 3) Confirmed optimization opportunities (research only)
1. Router optimization:
- Expand deterministic fast classification coverage to reduce LLM router calls.

2. Contract guard optimization:
- Validate/normalize earlier and avoid full reprompt when fix can be deterministic.

3. Prompt size governance:
- Cap history/tool verbosity into adapter payload with explicit summarization windows.

4. Telemetry-first cost controls:
- Track per-stage token usage and classify hot paths by `pipeline/stage/provider`.

## 4) Initial measurement plan
- For each message run, capture:
  - router call count,
  - stage executor call count,
  - contract reprompt count,
  - total input/output tokens,
  - provider/model.
- Segment by execution mode and request type.

## 5) Stop condition
Research artifact only. No runtime optimization changes implemented.
