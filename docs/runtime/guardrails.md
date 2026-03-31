# Runtime Cost Guardrails

## Purpose

To prevent unchecked resource consumption and "budget burn" during autonomous agent execution. These guardrails are enforced by the `RuntimeOrchestrator` and `AgentExecutor`.

## Hard Limits (Sprint 0.5 Baseline)

| Parameter | Value | Description |
| :--- | :--- | :--- |
| `MAX_TOKENS_PER_RUN` | 50,000 | Maximum cumulative tokens (input + output) per single run ID. |
| `MAX_LLM_CALLS` | 25 | Maximum number of individual LLM inference calls per run. |
| `MAX_RUN_DURATION` | 300s | Maximum wall-clock time for a single execution thread. |

## Abort Rules

If any of the following conditions are met, the runtime **MUST** immediately transition to `FAILED` state with an `ERR_COST_EXCEEDED` signal:

1. **Token Overflow**: Cumulative token count exceeds `MAX_TOKENS_PER_RUN`.
2. **Iteration Overflow**: Total agent loops/calls exceed `MAX_LLM_CALLS`.
3. **Stall Detection**: No event emitted for > 60 seconds (unless explicitly paused for HITL).

## Cost Tracking Logic

- **Calculation**: `RunCost = (InputTokens * InputPrice) + (OutputTokens * OutputPrice)`
- **Ledger**: Every event in the `EventBus` should include a `meta.consumption` block if it involved an LLM call.

## UI/UX Feedback

1. **Warning**: Cockpit UI displays a yellow indicator when costs reach 80% of any limit.
2. **Hard Stop**: Promptly show a red rejection modal when an Abort Rule is triggered.

## Acceptance Mapping (PM-S0.5-9, PM-S0.5-10)

- `max tokens / run` -> Defined in Hard Limits.
- `max llm calls` -> Defined in Hard Limits.
- `run aborts on limit` -> Defined in Abort Rules.

---
*Reference: [sprint0_5.md](file:///Users/myasnikoviv/development/agent-system/docs/process/roadmaps/pm-pack/sprint0_5.md)*
