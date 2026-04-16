# Requirements Pack: AGSYS-3802

## Goal
Extract persistence initialization boundary from control-api index into dedicated bootstrap module with explicit interface.

## Scope
- Move sqlite DB bootstrap/schema ensure/compat migrations.
- Move storage/service construction (object/secrets/postgres/env stores).
- Keep endpoint behavior unchanged.

## Acceptance Criteria
- persistence bootstrap module exists and is used by index.ts.
- control-api build passes.
- no API contract changes.

## Approval Traceability
- Approver: User (Owner)
- Status: APPROVED
- Timestamp: 2026-04-16
