# AGSYS-303 — Postflight Evidence

## Ticket

- Plane: `AGSYS-303` (`PM-S0.5-10 — Abort Rules`)
- Branch: `codex/AGSYS-303-abort-rules`

## Deliverables

1. `docs/runtime/abort-rules.md`
2. `docs/process/tickets/AGSYS-303.md`
3. `docs/process/pm/pipeline-state/AGSYS-303.md`
4. `docs/process/git/preflights/AGSYS-303.env`

## Verification

### CLI/API smoke

- Validation type: abort policy integrity
- Result: `PASS`
- Notes: abort conditions and terminal behavior documented.

### UI smoke (Playwright)

- Result: `N/A`
- Rationale: docs-only task.

## Acceptance Check

1. Abort-on-threshold rule documented: `PASS`
