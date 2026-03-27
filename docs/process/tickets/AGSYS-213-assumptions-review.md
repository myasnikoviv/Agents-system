# AGSYS-213 Assumptions Review

## Ticket
- ID: `AGSYS-213`
- Pipeline: `feature-change`

## Assumptions
1. `effectiveMode` can be treated as source-of-truth for which control groups are visible.
2. Existing runtime endpoints can expose enough capability metadata without breaking callers.
3. Main UX regressions are from IA/state wiring, not from provider adapter execution.
4. This ticket can ship with minimal backend contract extension and targeted UI updates.

## Validation Plan
- Verify current capability payload usage in frontend.
- Define/confirm explicit visibility matrix: `cli` vs `direct`.
- Add/adjust tests for mode-gated rendering and settings save/load behavior.
- Run API + UI smoke after implementation.

## Risks
- Hidden coupling in legacy settings/state hydration may reintroduce stale values.
- Incomplete mode propagation could leave composer and settings out of sync.
- Over-aggressive cleanup may hide controls needed by fallback paths.

## Mitigations
- Use incremental diff with tests around capability contract and composer rendering.
- Keep explicit fallback branch with deterministic defaults.
- Add postflight smoke scenarios for both mode paths.

## Approval Traceability
- Approver: Owner (chat)
- Approval status: Approved
- Approved at: 2026-03-27T21:34:11+01:00
