# AGSYS-26 — Canonical Plane Ticket Contract Gate

## Ticket Code
- Prefix class: PM
- Title format: PM-26 — Canonical Plane Ticket Contract Gate

## Context / Problem
Ticket quality drifted from canonical format, causing missing scope, weak acceptance criteria, and expensive context reconstruction.

## Scope
- Included: canonical contract, PM response contract extension, preflight ticket validity checks, persistent state requirements.
- Excluded: API-level hardcoded orchestration.

## Existing Phase
- Governance hardening.
- Canonical template and gate already introduced, now expanded with ticket-linked response and persistence checks.

## Dependencies
- AGENTS.md response protocol.
- docs/process/pm contracts.
- scripts/git/preflight_guard.sh.

## Acceptance Criteria
1. PM response contract includes `Ticket` line.
2. Preflight guard blocks execution when ticket state is cancelled/blocked or acceptance lock is NO.
3. Pipeline state contract includes persistent branch/worktree/preflight/ticket-status fields.
4. Continue/resume flow can restore context from state card only.

## Evidence Required
- Updated contracts in docs/process/pm/.
- Updated preflight guard script.
- Valid state card for AGSYS-26.

## Expected Pipeline
1. PM
2. Git
3. PM

## Handoff Protocol
- Each handoff must include what changed, where evidence lives, and explicit next owner action.

## Git Preflight
- Branch: codex/AGSYS-26-canonical-ticket-guard
- Worktree: /Users/myasnikoviv/development/trade_bot
- Token: docs/process/git/preflights/AGSYS-26.env

## Gate
- In Progress allowed only if ticket status executable and acceptance lock YES.
- Done allowed only after guard + docs contract alignment.

## User Story Container
- Plane Module: governance-hardening (logical container).
- Scenario: stable ticket-driven execution and fast context restore.
