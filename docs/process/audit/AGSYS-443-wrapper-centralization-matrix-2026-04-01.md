# AGSYS-443 Wrapper Centralization Matrix (2026-04-01)

## Objective
Ensure LLM invocations pass through observable wrapper boundaries.

## Verified paths

1. `src/runtime/llm/LLMWrapper.ts`
- Emits `llm.request` and `llm.response` runtime events.

2. `src/runtime/adapters/GeminiAdapter.ts`
- Uses `wrapLLMCall`.

3. `src/runtime/IntakeClassifier.ts`
- Updated in this remediation wave to route Gemini and OpenAI classifier calls through `wrapLLMCall`.

4. `src/runtime/IntakeGovernance.ts`
- Updated in this remediation wave to route intake quality LLM evaluation through `wrapLLMCall`.

## Residual exceptions (tracked)

- `src/runtime/adapters/LangChainAdapter.ts`
  - Executes `model.invoke(...)` directly and returns usage metadata.
  - Still telemetry-capable, but not fully centralized in `LLMWrapper`.

## Decision
- Mark centralization as materially improved for intake/governance critical paths.
- Keep adapter-layer unification as follow-up hardening item.

## Evidence
- Commits in this wave include wrapper routing in intake layer and governance stream visibility.
