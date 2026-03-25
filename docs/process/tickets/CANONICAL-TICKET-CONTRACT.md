# Canonical Ticket Contract (Mandatory)

This contract is mandatory for all non-trivial Plane tickets.

## Required Sections
0. `Ticket Code`
1. `Context / Problem`
2. `Scope`
- Included
- Excluded
3. `Existing Phase`
4. `Dependencies`
5. `Acceptance Criteria`
6. `Evidence Required`
7. `Expected Pipeline`
8. `Handoff Protocol`
9. `Git Preflight`
10. `Gate`
11. `User Story Container`

## Canonical Body Rules
- Ticket title must start with internal code prefix, e.g. `PM-`, `ARCH-`, `DEV-`, `QA-`, `REV-`, `RUN-`, `DOC-`, `OPS-`, `GIT-`, `UX-`, `TRD-`.
- Title-only or 1-2 line briefs are forbidden.
- Ticket body must be concrete and testable.
- Acceptance criteria must be measurable.
- Pipeline must be ordered with responsible roles.
- Handoff requirements must state artifact expectations for the next owner.
- Git preflight expectations must be explicit (branch/worktree/token).
- Ticket must reference one parent User Story container (Plane Module) for grouped scenario execution.

## Minimum Content Gate
- Minimum body length: 900 characters.
- All required section headers must exist.
- Missing header or below-minimum body length means ticket is invalid.

## Validation Command
Use this gate before moving ticket to `In Progress`:

```bash
bash scripts/pm/ticket_brief_gate.sh <path-to-brief-md>
```

If validation fails, PM must return ticket to `Backlog` for rewrite.
