# Handoff Protocol (PM-Controlled)

## Purpose
Preserve execution context while moving tickets between responsible agents.

## Mandatory On Every Handoff
1. Re-assign ticket to next owner.
2. Add handoff comment with:
   - completed stage summary,
   - pass/fail status for stage criteria,
   - artifact links (tests/runs/review/commits/docs),
   - open risks/questions,
   - exact next action for new owner.
3. Move status only if stage exit criteria are met.

## Rejection/Return Flow
- If stage fails, ticket is reassigned back to the role that must rework.
- Reviewer/Architect/QA must explain failure reason and acceptance delta.
- PM validates that rework instruction is actionable.

## Artifact Expectations By Role
- Architect: design note / constraints / invariants.
- TDD QA: failing + passing test evidence.
- Developer: implementation notes + commit links.
- Reviewer: finding list or approval note.
- Runner: run report and metric comparison.
- Trader: strategy behavior validation notes.
- Docs: updated docs links.
- Git: merge/release trace.

## PM Audit
- PM checks handoff completeness daily.
- Missing handoff context => ticket paused until corrected.
