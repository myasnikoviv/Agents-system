# AGSYS-35 — Pre-intake Auto-RCA Gate

## Context / Problem
New mutating executions can start while unresolved Auto-RCA follow-up tickets already exist, causing recurring drift and duplicate failure loops.

## Scope
- Add runtime pre-intake gate in `/api/chat`.
- Detect unresolved `Auto-RCA follow-up` issues in current Plane project.
- Block mutating pipelines until follow-ups are resolved (unless user explicitly runs remediation).

## Acceptance Criteria
- `/api/chat` returns blocked response when unresolved Auto-RCA follow-ups exist and request is mutating execution.
- Block response includes unresolved follow-up list and remediation instruction.
- Explicit remediation prompts (RCA/follow-up/self-improvement) bypass this gate.
- Unit tests cover gate helper behavior.

## Expected Pipeline
- `pipeline=new-feature`
- stages: intake -> developer -> qa -> reviewer -> git -> docs

## Gate
- Preflight token valid for branch/worktree.
- Runtime tests pass.
- Plane evidence comment includes response contract and test output.
