# AGSYS-216 Assumptions Review

## Ticket
- ID: `AGSYS-216`
- Pipeline: `feature-change`

## Assumptions
1. Runtime provider selector in composer is currently used as executor selector in CLI-effective mode.
2. Backend may return capability hints (`effectiveMode`, `selectedBackend`), but UI must degrade gracefully if hints are absent.
3. A visible execution-path badge in the composer footer reduces ambiguity for users.

## Validation Plan
- Add runtime capability state in composer from `/api/cockpit/providers`.
- Render selector semantics as `Executor` in CLI mode and `Provider` in direct mode.
- Add clear active execution-path badge in runtime footer strip.
- Preserve model selector and runtime selection API calls.

## Risks
- Older backend payloads without capability fields.
- Mismatch between selected provider and selected backend labels.

## Approval Traceability
- Approver: Owner (chat)
- Approval status: Approved
- Approved at: 2026-03-27T21:56:11+01:00
