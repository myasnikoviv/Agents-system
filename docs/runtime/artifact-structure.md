# Artifact Structure Specification (AGSYS-299)

## Purpose

Define canonical artifact tree so all runtime, test, and debug materials are centralized and discoverable.

## Canonical Structure

```text
docs/
  runtime/
    architecture.md
    sequence.md
    event-ui-contract.md
    rendering-rules.md
    responsibility-map.md
    artifact-structure.md
    index.md
    system-dod.md
    token-budget-limits.md
    abort-rules.md
    io-schema.md
  tests/
    execution_modes.md
    isolation.md
    handoff.md
  debug/
    prompt_traces.md
    event_samples.md
  process/
    tickets/
    tests/
    reviews/
    runs/
    pm/pipeline-state/
    git/preflights/
```

## Placement Rules

1. Runtime contracts and architecture artifacts go to `docs/runtime/`.
2. Validation matrices and smoke outputs go to `docs/tests/` and `docs/process/tests/`.
3. Prompt/event trace diagnostics go to `docs/debug/`.
4. Ticket-scoped governance artifacts go to `docs/process/*`.

## Acceptance Mapping (`PM-S0.5-6`)

- structure in `/docs` created -> directories and spec defined.
- artifacts centralized -> placement rules enforce one location per artifact class.
