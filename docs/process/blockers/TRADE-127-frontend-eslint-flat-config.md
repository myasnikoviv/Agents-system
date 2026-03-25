# Blocker Report: TRADE-127

Date: 2026-03-20
Parent Ticket: TRADE-120
Blocker Ticket: TRADE-127
Category: qa/tooling
Status: Partially Resolved (Scope-gated)

## Problem
`frontend npm run lint` failed because ESLint v9 requires flat config and no `eslint.config.*` existed.

## Recovery Attempts
1. Tool path
- Action: added `frontend/eslint.config.js`.
- Result: lint command started successfully, but exposed historical lint debt across unrelated files (42 errors, 115 warnings).

2. QA scope path
- Action: executed scoped lint for cockpit surface only and removed local warning source.
- Commands:
  - `npm run lint:cockpit`
  - removed unused `eslint-disable` in `CockpitPage.tsx`
- Result: scoped cockpit lint PASS.

3. Delivery safety path
- Action: verified build remains green after lint-scope changes.
- Result: `frontend npm run build` PASS.

## Evidence
- `eslint.config.js` present and active.
- `lint:cockpit` script added to `frontend/package.json` and passes.
- Full-repo lint still red due pre-existing tech debt outside TRADE-120 scope.

## Resolution
Blocker resolved for TRADE-120 scoped QA gate.
Follow-up recommended: create separate tech-debt ticket for global frontend lint cleanup.
