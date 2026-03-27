# AGSYS-231 Requirements Pack

## Ticket
- ID: `AGSYS-231`
- Title: `UI: Make Cockpit right panel scrollable`
- Pipeline: `bug-fix`
- Owner: PM Orchestrator + Developer

## Problem Statement
In Cockpit runtime view, the right column (`Live Hive State`) does not reliably scroll when content grows. On smaller viewport heights, part of the panel content becomes inaccessible.

## Scope
1. Make the right panel independently scrollable.
2. Preserve existing layout split (left / center / right) and avoid regressions in center chat area.
3. Keep implementation in existing Tailwind utility style (no direct CSS file additions in this change).

## Out of Scope
- Swarm data model changes.
- Event rendering logic changes.
- Any backend/runtime endpoint changes.

## Acceptance Criteria
- Right panel scrolls vertically when content exceeds viewport height.
- Panel header remains stable, and content area is accessible with scroll.
- No clipping of right panel content on reduced viewport height.
- Frontend build passes.

## Approval Traceability
- Approver: Owner (chat)
- Approval status: Approved
- Approved at: 2026-03-27T19:09:00+01:00
