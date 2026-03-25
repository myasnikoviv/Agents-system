# PM-803: Role-Strict Execution and Ticket Governance Remediation

## Type
Process / Governance

## Priority
urgent

## Owner
- Primary: `Сокіл-Координатор (PM Orchestrator)`
- Support: `Пан Гілка (Git Flow Manager)`, `Вартовий Якості (Code Reviewer)`

## Context / Problem
Execution happened without strict role handoff boundaries and without full Plane ticket-first lifecycle for each change stream.

## Scope
- Enforce role-strict handoff protocol for all medium/high complexity tasks.
- Enforce ticket-first rule in Plane before implementation.
- Add mandatory checklist for role transfer, artifact evidence, and assignee changes.

## Out Of Scope
- Business feature implementation.
- Runtime code changes unrelated to governance.

## Expected Pipeline (Mandatory)
1. PM Orchestrator
- Artifact: refined governance requirements + acceptance criteria.
- Handoff condition: governance scope approved.
2. Research Agent
- Artifact: comparison of role-handoff patterns and anti-patterns.
- Handoff condition: recommendation and trade-offs documented.
3. Solution Architect
- Artifact: process design update for role boundaries.
- Handoff condition: design accepted by PM.
4. Code Reviewer
- Artifact: review report on enforceability and traceability gaps.
- Handoff condition: no high-risk governance holes.
5. Git Flow Manager
- Artifact: preflight/audit integration updates.
- Handoff condition: operational compatibility confirmed.
6. Documentation Owner
- Artifact: final docs updates and canonical links.
- Handoff condition: docs lifecycle gate satisfied.
7. PM Orchestrator
- Artifact: final ACCEPT/REWORK decision.

## Dependencies
- Plane operational baseline (`OPS-905`).
- Git/worktree policies and audit scripts availability.

## Acceptance Criteria
1. Every non-trivial task explicitly defines role chain with ownership transitions.
2. Ticket-first and preflight-first rules are mandatory and documented.
3. Handoff requires assignee change + evidence comment + next action.
4. Governance artifacts are linked from canonical process index.

## Evidence Required
- Updated governance docs.
- Review report with findings status.
- PM acceptance note.

## Status
- State: `In Progress`
- Current owner: `Сокіл-Координатор (PM Orchestrator)`

## Execution Log (Current)
1. Role execution policy documented:
   - `docs/process/pm/ROLE-EXECUTION-MODE.md`
2. New governance tickets created with explicit role pipelines:
   - `OPS-905`, `GIT-606`, `DEV-812`
3. Execution queue with owners/handoffs published:
   - `docs/process/pm/EXECUTION-QUEUE-2026-03-16.md`

## Next Handoff
- `PM -> Research Agent`: produce role-handoff anti-pattern brief and enforcement recommendations.
