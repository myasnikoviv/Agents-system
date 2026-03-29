# AGSYS-297 — Postflight Evidence

## Ticket

- Plane: `AGSYS-297` (`PM-S0.5-4 — Event Mapping Spec`)
- Branch: `codex/AGSYS-297-event-mapping-spec`

## Deliverables

1. `docs/runtime/event-ui-contract.md`
2. `docs/process/tickets/AGSYS-297.md`
3. `docs/process/pm/pipeline-state/AGSYS-297.md`
4. `docs/process/git/preflights/AGSYS-297.env`

## Verification

### CLI/API smoke

- Validation type: documentation contract integrity
- Result: `PASS`
- Notes: event mapping table and deterministic rules are present and aligned to Sprint 0.5 acceptance.

### UI smoke (Playwright)

- Result: `N/A`
- Rationale: this ticket is documentation-only and introduces no UI/runtime code change.

## Acceptance Check

1. Each event has mapping: `PASS`
2. One event = one UI block rule: `PASS`
