# AGSYS-214 Assumptions Review

## Ticket
- ID: `AGSYS-214`
- Pipeline: `feature-change`

## Assumptions
1. Runtime capability payload should be the single source of truth for UI gating.
2. Backend can expose `effectiveMode` and capability flags without breaking existing consumers.
3. Existing frontend can consume extended payload with backward-compatible merge logic.

## Validation Plan
- Extend `/api/cockpit/providers` capabilities object with canonical fields.
- Ensure settings/composer consume these fields without fallback drift.
- Run API smoke and frontend build.

## Risks
- Contract drift between backend payload and frontend types.
- Hidden legacy dependencies on implicit provider semantics.

## Approval Traceability
- Approver: Owner (chat)
- Approval status: Approved
- Approved at: 2026-03-27T21:39:30+01:00
