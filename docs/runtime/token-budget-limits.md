# Token Budget Limits (AGSYS-302)

## Purpose

Define hard runtime limits to prevent runaway cost and cascading retries.

## Budget Policy

```yaml
limits:
  max_tokens_per_run: 120000
  max_tokens_per_stage: 30000
  max_llm_calls_per_run: 24
  max_llm_calls_per_stage: 6
  max_tool_calls_per_stage: 20
  max_retries_per_stage: 2
```

## Enforcement Rules

1. Runtime accumulator tracks input/output token usage per run and per stage.
2. If stage budget is exceeded, stage emits `guard.flagged` and transitions to controlled abort/fallback.
3. If run budget is exceeded, run terminates with explicit `run.failed` reason `budget_exceeded`.
4. Retries consume budget and are counted toward call limits.
5. Budget counters are persisted in run artifacts for postmortem.

## Telemetry Requirements

- Emit events:
  - `budget.snapshot`
  - `budget.threshold_warning`
  - `budget.exceeded`
- Include fields: `runId`, `stage`, `tokenUsed`, `tokenLimit`, `llmCallsUsed`, `llmCallsLimit`.

## Acceptance Mapping (`PM-S0.5-9`)

- max tokens/run documented.
- max llm calls documented.
