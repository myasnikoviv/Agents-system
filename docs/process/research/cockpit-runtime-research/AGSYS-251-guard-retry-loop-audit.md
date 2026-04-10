# AGSYS-251 — Guard & Retry Loop Audit

Date: 2026-03-28  
Scope: Research only (no implementation)

## 1) Loop inventory (confirmed)

1. Graph loop (`swarm -> swarm`) until pipeline completion
- Conditional edge keeps execution in swarm until `pipeline_completed`.
- Evidence: `src/runtime/graphs/PilotQuasiLinearGraph.ts:727-732`, graph wiring at `798-799`.

2. Contract guard reprompt loop (bounded to 1 extra call)
- On contract violation:
  - emits `contract_fail`,
  - emits `contract_reprompt`,
  - runs one additional executor call,
  - falls back to deterministic formatting if still invalid.
- Evidence: `src/runtime/graphs/PilotQuasiLinearGraph.ts:567-654`

3. Provider-level retry (Redis transport)
- Redis client has retry strategy with bounded delay function.
- Evidence: `src/runtime/redisClient.ts:10-14`

4. Router classification default
- If LLM classification fails, pipeline falls back to `unified-task-intake`.
- Evidence: `src/runtime/IntakeClassifier.ts:330-339`, and router default artifact `src/runtime/graphs/PilotQuasiLinearGraph.ts:310-328`

## 2) Stop conditions and bounds

- Contract reprompt: bounded (max one reprompt attempt before default message).
- Swarm stage loop: bounded by pipeline stage progression or reroute conditions; if stage progression fails, risk of repeated stage behavior remains possible.
- Redis retry: bounded delay step function, but connection retry lifecycle is managed by ioredis internals.

## 3) Expensive / risky loop patterns
1. Contract reprompt doubles stage call cost when formatting is unstable.
2. Router LLM classify + stage LLM call serial overhead for each message.
3. Drift reroute can prolong runs (`routed:reclassify` path).
- Evidence: `src/runtime/graphs/PilotQuasiLinearGraph.ts:672-690`

## 4) Candidate guardrail improvements (research only)
1. Add per-run guard counters to artifact logs:
- `router_calls`, `contract_reprompts`, `reroutes`.

2. Define hard ceiling for reroute count per run.

3. Early format normalization before full reprompt where feasible.

## 5) Stop condition
Research artifact only. No loop logic changes implemented.
