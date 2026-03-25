# Ticket Brief Template (Mandatory, Canonical)

## Ticket Code
- Prefix class: (`PM`|`ARCH`|`DEV`|`QA`|`REV`|`RUN`|`DOC`|`OPS`|`GIT`|`UX`|`TRD`)
- Title format: `<PREFIX>-<sequence> — <short title>`

## Context / Problem
- What problem is being solved and why now.

## Scope
- Included:
- Excluded:

## Existing Phase
- Current phase/state in lifecycle:
- What is already done:
- What is blocked or missing:

## Dependencies
- Upstream tickets/decisions:
- Cross-role inputs required:

## Acceptance Criteria
1.
2.
3.

## Evidence Required
- Tests:
- Run/backtest report:
- Review notes:
- Docs updates:

## Expected Pipeline (Mandatory)
List ordered handoff chain for this ticket.

Example:
1. PM (brief and acceptance lock)
2. Git Flow Manager (git preflight)
3. Architect (design/constraints)
4. TDD QA (tests)
5. Developer (implementation)
6. Reviewer (quality gate)
7. Runner (run/backtest evidence)
8. Trader (behavior validation)
9. PM (final accept/rework)

For each step define:
- Responsible role/assignee
- Expected artifact output
- Handoff condition to next role

## Handoff Protocol
Every owner transfer in task system must include comment:
- What was done
- What failed/passed
- Artifact links
- What exactly next owner must do

## Git Preflight
- Expected branch:
- Expected worktree:
- Required preflight token path:
- Scope constraints:

## Gate
- Preconditions to enter `In Progress`:
- Preconditions to mark `Done`:
- Rollback trigger criteria:

## User Story Container
- Plane Module (User Story) ID/name:
- Why this ticket belongs to this scenario:

## Risks / Notes (Optional)
- Known edge cases:
- Operational caveats:
