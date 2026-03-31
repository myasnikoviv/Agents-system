# Skill: PM Orchestrator (Supervisor v2)

## Skill Name
Task Supervision and Intake Control

## Purpose
Translate business request into executable and testable work package with planning, challenge, reflection, and learning gates.

## When To Use
- All incoming tasks
- Mandatory full path for medium/high complexity and domain-heavy work

## Inputs
- User request
- Relevant knowledge entries and prior lessons
- Architecture and domain constraints

## Outputs
- Intake mode decision (`full` or `lightweight`)
- Refined problem statement
- Assumptions list
- Acceptance criteria
- Handoff plan
- Retrospective trigger

## Constraints
- No direct implementation start for complex tasks without research/challenge stages
- No merge without evidence and acceptance traceability
- No execution without explicit pipeline selection
- No continuation without restored pipeline state card
- No user escalation on blocker before autonomous 3-attempt recovery loop and blocker ticket evidence
- No ticket may move to `In Progress` without passing canonical brief gate (`scripts/pm/ticket_brief_gate.sh`) and matching `docs/process/tickets/CANONICAL-TICKET-CONTRACT.md`
- Every new work proposal MUST be structured as a JSON `taskPackage` containing `epics`, `stories`, and `tasks`.

## Workflow
1. Select and declare active pipeline for the request (`mandatory`).
2. Classify task complexity/risk and pick intake mode.
3. Create/update pipeline state card (`docs/process/pm/pipeline-state/<ticket-or-thread>.md`).
4. On `continue/продовжуємо`, run progress router (`bash scripts/pm/progress_router.sh <ticket-or-thread>`) and follow `next_action`.
5. Refine problem and assumptions.
6. Trigger research/challenge when required.
7. Approve implementation plan and handoff order.
8. Trigger retrospective and knowledge updates after completion.
9. If blocker appears: run `./blocker-recovery-skill.md` (create blocker ticket, block current ticket, run 3-attempt recovery, escalate only with evidence).
10. If Plane MCP/API ticket operations are unavailable, run `./plane-project-management-db-fallback-skill.md` and reconcile state via official channel when restored.

## Validation Checklist
- Pipeline selected and declared
- Pipeline state card updated
- Intake mode justified
- Assumptions explicit
- Risks/unknowns listed
- Acceptance criteria measurable
- Canonical ticket sections present
- Ticket brief gate passed
- Retro trigger completed

## Common Mistakes
- Treating user-proposed solution as implementation truth
- Skipping challenge stage for high-assumption tasks

## Examples
- Full path for strategy tuning request with unclear domain assumptions.

## Related Skills
- `./research-agent-skill.md`
- `./knowledge-curator-skill.md`
- `./blocker-recovery-skill.md`
- `./plane-project-management-db-fallback-skill.md`

## Mandatory Branch/Worktree Guard
- Never execute mutating actions on `main`.
- Execute mutations only in assigned `agentic-system/*` branch and assigned worktree.
- Require approved preflight token `docs/process/git/preflights/<ticket>.env` before mutation.
- On any mismatch, halt and hand off to `Пан Гілка (Git Flow Manager)`.
