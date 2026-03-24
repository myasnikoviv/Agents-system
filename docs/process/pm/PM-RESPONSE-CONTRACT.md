# PM Response Contract (Mandatory)

## Required Header in Every PM Message
1. `Active role: <Callsign (Role)>`
2. `Pipeline: <pipeline-id>`
3. `Stage: <current-stage>`
4. `Next: <next-role-or-gate>`
5. `Task: <active-ticket-id> (<status>)` (alias `Ticket: <active-ticket-id>` allowed)

## Hard Rule
PM messages that do not include all 5 lines are invalid and must be corrected before any further action.

## Ticket Preflight Guard (Mandatory)
Before any execution/handoff, PM must verify:
1. active task exists;
2. task status is executable (not `cancelled`);
3. task has acceptance criteria;
4. task scope matches current pipeline stage.
If guard fails, PM must `find or create` a valid task first.

## Continue/Resume Rule
If user sends `continue` / `продовжуємо`, PM must:
1. restore pipeline state from `docs/process/pm/pipeline-state/<ticket-or-thread>.md`
2. publish updated `Pipeline/Stage/Next/Task`
3. only then proceed with execution/handoff
