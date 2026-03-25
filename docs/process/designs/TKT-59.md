# TKT-59 Design: Quota-Safe Approve Continuation

## Problem
`qaNode` in `PilotQuasiLinearGraph` executes `executor.runRole` without `try/catch`. Any OpenAI quota failure throws and aborts `/api/chat/approve`.

## Root Cause Localization
- Graph node: `src/runtime/graphs/PilotQuasiLinearGraph.ts` (`qaNode`).
- API surface: `src/server.ts` `/api/chat/approve`.
- Error class propagated from LangChain OpenAI integration.

## Proposed Change
1. Add guarded execution to `qaNode` with explicit fallback message.
2. Introduce shared helper for LLM error classification (`insufficient_quota`, `rate_limit`, `auth`, `unknown`) to keep logs actionable.
3. Keep graph moving with synthetic QA artifact when provider is unavailable.
4. Add regression test validating non-throw behavior for quota error path.

## Non-Goals
- Billing/account remediation (external to repository).
- Changing provider/model routing strategy.

## Risks
- Over-catching could hide genuine coding bugs.
Mitigation: classify and log only provider-originated failures; preserve throw for non-provider failures in tests if needed.
