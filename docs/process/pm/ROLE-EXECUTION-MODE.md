# Role Execution Mode (Single-Operator with Mandatory Handoffs)

## Why this document exists
Role names are real governance boundaries, but runtime execution may happen by one operator session (assistant) unless physically separated agents are deployed.

## Execution Reality
- Current environment uses one operator session.
- Role switching is governance-driven and must be explicit in artifacts.
- A role may not skip required predecessor gates.

## Mandatory Gates
1. Ticket exists with full brief and expected pipeline.
1.1 Pipeline is explicitly selected for current request (`no-pipeline` execution is forbidden).
2. Current owner role is explicitly declared.
3. Handoff to next role includes evidence and next action.
4. For mutating work: Git preflight + assigned branch/worktree are required.
5. Preflight token must exist and be approved: `docs/process/git/preflights/<ticket>.env`.
6. Explicit user go/no-go must be recorded before execution stage.
7. Pipeline state card exists and is up-to-date: `docs/process/pm/pipeline-state/<ticket-or-thread>.md`.
8. No implementation may start while any gate is missing.

## Enforcement Rules
- If a required role handoff is missing, task is blocked.
- If ticket is missing, task is blocked (except read-only triage).
- If Git preflight is missing, mutating work is blocked.
- If preflight token is missing/mismatched, commit/push must be blocked.
- If pipeline state card is missing/stale, execution is blocked until PM reconciles state.

## Target Evolution
When multi-runtime role agents are introduced, this policy remains the contract and execution ownership simply becomes physically distributed.
