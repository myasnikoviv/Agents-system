# AGSYS-295 — Postflight Evidence

## Ticket

- Plane: `AGSYS-295` (`PM-S0.5-2 — Sequence Flow Diagram`)
- Branch: `codex/AGSYS-295-sequence-flow-diagram`

## Deliverables

1. `docs/runtime/sequence.md` (runtime lifecycle sequence diagram)
2. `docs/process/tickets/AGSYS-295.md`
3. `docs/process/tests/AGSYS-295.md`
4. `docs/process/git/preflights/AGSYS-295.env`
5. `docs/process/pm/pipeline-state/AGSYS-295.md`

## Verification

### CLI/API smoke

- Validation type: documentation artifact integrity
- Result: `PASS`
- Notes: sequence flow contains required path `input -> agent -> LLM -> events -> UI`.

### UI smoke (Playwright)

- Result: `N/A`
- Rationale: no UI code changes in this ticket.

## Acceptance Check

1. Sequence diagram exists: `PASS`
2. Full flow visible in ordered steps: `PASS`
