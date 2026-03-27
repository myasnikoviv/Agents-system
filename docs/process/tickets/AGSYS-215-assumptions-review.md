# AGSYS-215 Assumptions Review

## Ticket
- ID: `AGSYS-215`
- Pipeline: `feature-change`

## Assumptions
1. Settings IA can be refactored in-place without breaking saved data schema.
2. Mode-gated sections can coexist with current backend contract.
3. Duplicated control groups are the primary source of UX confusion.

## Validation Plan
- Implement section-level gating per `effectiveMode`.
- Ensure no duplicated controls for same responsibility.
- Smoke test save/load and health actions.

## Risks
- Hidden dependency on currently duplicated controls.
- Regressions in login/help text visibility.

## Approval Traceability
- Approver: Owner (chat)
- Approval status: Approved
- Approved at: 2026-03-27T21:41:50+01:00
