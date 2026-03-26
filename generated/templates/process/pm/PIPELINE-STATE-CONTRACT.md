# Pipeline State Contract (Mandatory)

## Goal
Guarantee that pipeline execution cannot drift, be skipped, or be forgotten across long conversations and context resets.

## Required Artifact
- Path: `docs/process/pm/pipeline-state/<ticket-or-thread>.md`
- Owner: `Сокіл-Координатор (PM Orchestrator)`
- Update frequency: after each stage transition and before each role handoff.

## Required Fields
1. `Pipeline`
2. `Mode` (`full` | `lightweight`)
3. `Current Stage`
4. `Completed Stages`
5. `Next Stage`
6. `Current Owner`
7. `Next Owner`
8. `Ticket`
9. `Thread`
10. `Last Updated`
11. `Blocking Gates`
12. `Evidence Links`
13. `Plane Status` (`Backlog|Todo|In Progress|Review|Done|Cancelled|Blocked`)
14. `Branch`
15. `Worktree`
16. `Preflight Token`
17. `Acceptance Lock` (`YES|NO`)

## Hard Rules
- No role may execute without a current pipeline state card.
- If card is missing, PM must create/reconstruct it before continuing.
- On user message `continue/продовжуємо`, PM must restore from card first.
- On `continue/продовжуємо`, PM must run progress router (`scripts/pm/progress_router.sh`) before any role action.
- If actual execution diverges from card, work is blocked until reconciliation.
- If `Plane Status` is `Cancelled`/`Blocked`, execution is forbidden.
- If `Acceptance Lock` is `NO`, execution is forbidden.

## Minimal Card Template
```md
# Pipeline State: <ticket-or-thread>
- Pipeline: <pipeline-id>
- Mode: <full|lightweight>
- Current Stage: <stage>
- Completed Stages: <a, b, c>
- Next Stage: <stage>
- Current Owner: <role>
- Next Owner: <role>
- Ticket: <id or N/A>
- Thread: <id>
- Last Updated: <ISO datetime>
- Blocking Gates: <none|list>
- Evidence Links: <paths>
- [object Object] Status: <state>
- Branch: <branch>
- Worktree: <absolute-path>
- Preflight Token: <path>
- Acceptance Lock: <YES|NO>
```
