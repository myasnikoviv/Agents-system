# System Definition of Done (AGSYS-301)

## Purpose

Define when the runtime system is considered healthy and releasable at system level.

## System DoD

```yaml
SystemDoD:
  no_context_leak: true
  no_infinite_loops: true
  deterministic_execution: true
  traceable_prompts: true
  reproducible_runs: true
  stable_event_projection: true
  bounded_cost_behavior: true
```

## Validation Checklist

1. Reproducible run: same input + config -> equivalent stage path.
2. Events complete: run has `run.started` and terminal event (`run.completed` or `run.failed`).
3. No duplicate critical calls: no repeated unintended provider/tool calls.
4. No stuck runs: timeout/abort policy can terminate every run.
5. Prompt traceability: every provider call has request/response metadata.
6. Context isolation: new run does not leak previous unrelated thread state.
7. UI projection stability: chat and timeline satisfy event-to-UI contract.

## Evidence Channels (for Done gate)

- CLI/API smoke evidence in `docs/process/tests/<ticket>.md`
- UI smoke evidence (or explicit N/A rationale)
- Pipeline state update in `docs/process/pm/pipeline-state/<ticket>.md`

## Acceptance Mapping (`PM-S0.5-8`)

- stability criteria documented -> SystemDoD and checklist sections.
- includes loops/memory/prompts -> checklist items 4, 6, 5.
