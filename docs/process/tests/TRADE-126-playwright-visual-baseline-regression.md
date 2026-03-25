# TRADE-126 Playwright Visual Baseline + Regression Protocol

Date: 2026-03-20
Owner: TDD QA
Pipeline: design-audit
Status: Active protocol

## 1. Goal
Provide repeatable visual and interaction validation for Agent Cockpit UI after each design change.

## 2. Preconditions
1. Run from assigned branch/worktree with valid preflight token.
2. Backend and frontend started from the same worktree.
3. Cockpit reachable at `http://127.0.0.1:5174/cockpit/runtime`.

## 3. Startup Procedure
1. Stop stale local processes occupying cockpit ports.
2. Start backend in TRADE-120 worktree (`:3001`).
3. Start frontend in TRADE-120 worktree (`:5174`).
4. Verify route health before screenshots/interactions.

## 4. Required Test Matrix
### Desktop (1280+ width)
1. Route tabs switch and URL sync (`runtime/composer/catalog/settings/audit`).
2. Catalog chip click inserts token.
3. Catalog chip drag-and-drop into task input inserts token.
4. Provider form submit/save is functional.
5. Runtime feed renders status badges and issue links.

### Mobile (390x844)
1. Header remains usable and does not overflow controls.
2. Tab controls are tappable and readable.
3. Composer input and send controls are reachable.
4. Settings form remains operable without overlap.

## 5. Accessibility Quick Gate
1. Icon-only send button has accessible name.
2. Form controls have semantic label bindings.
3. Focus-visible outline appears for keyboard navigation.
4. Reduced motion mode does not break usability.

## 6. Evidence Requirements
For each run, capture:
1. Timestamp.
2. Route visited.
3. Action performed.
4. Result (PASS/FAIL).
5. Screenshot or interaction snapshot reference.

## 7. Failure Handling
1. Create blocker artifact and mark ticket `Blocked` if matrix cannot proceed.
2. Attempt up to 3 distinct recoveries before user escalation.
3. Attach failure evidence (console/network/screenshot).

## 8. Regression Exit Criteria
All mandatory desktop + mobile checks PASS and no P0/P1 UI regressions introduced in:
- information architecture,
- composer token interaction,
- provider form UX,
- runtime observability clarity,
- accessibility baseline.
