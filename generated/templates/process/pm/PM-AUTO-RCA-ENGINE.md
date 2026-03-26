# PM Auto-RCA Engine

## Purpose
Automate post-run and post-sprint failure analysis so improvements are generated without waiting for user escalation.

## Trigger Points
- Any ticket returned from Review/QA more than once
- Any hard gate failure (preflight/postflight/integration)
- Any blocker escalation after autonomous retries
- Sprint closure attempt with missing evidence

## Inputs
- Pipeline state artifact
- Quality telemetry artifact
- [object Object] issue comments + status history
- Git audit/cleanup results

## Workflow
1. Detect trigger event.
2. Generate RCA draft using fixed structure.
3. Classify root cause into one or more buckets:
- instruction gap
- skill/tool gap
- pipeline sequencing gap
- ownership/handoff gap
- test strategy gap
4. Generate at least one improvement ticket per critical bucket.
5. Link tickets to affected parent scope (story/sprint/epic).
6. Require explicit human `approve/reject` for critical policy changes.

## Output Artifacts
- `docs/process/retrospectives/<ticket>.md` section `RCA`
- `docs/process/instructions/<ticket>.md` when agent/policy changes are proposed
- `docs/process/skills/<ticket>.md` when skill changes are proposed

## Acceptance Rule
PM cannot mark sprint `Done` unless Auto-RCA ran on all failed-loop tickets and created required improvement backlog.
