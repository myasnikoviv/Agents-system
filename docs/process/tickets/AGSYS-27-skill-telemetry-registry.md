# AGSYS-27 — Skill Telemetry Registry

## Context / Problem
Integrated skills exist, but runtime has no persistent, queryable evidence proving which skills are used, by which role/pipeline/stage, and with what efficiency.

## Scope
- Add runtime skill-usage telemetry persistence.
- Capture ticket/thread/run linkage per skill invocation.
- Provide baseline summary API for top-used and unused skills.

## Acceptance Criteria
- Skill usage is persisted to a stable telemetry store.
- Telemetry rows include: skill, role, pipeline, stage, ticket/thread/run, duration, token usage, outcome.
- Summary output exists with: by-skill, by-role, by-pipeline, unused-skills.
- Unit tests cover persistence + summary behavior.

## Expected Pipeline
- `pipeline=new-feature`
- stages: intake -> architect -> developer -> qa -> reviewer -> git -> docs

## Gate
- Targeted runtime tests pass.
- Preflight token is valid for branch/worktree.
- Plane ticket has evidence comment with commit and report endpoints.

