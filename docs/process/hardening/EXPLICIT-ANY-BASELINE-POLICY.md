# Explicit-Any Baseline Policy

## Goal
Unblock CI for legacy `explicit any` debt without allowing new debt.

## Rules
- Baseline file: `docs/process/hardening/explicit-any-baseline.txt`
- `scripts/hardening_gates.sh` computes current matches for `src/core/GenericStrategy.ts` and `src/core/v2`.
- Gate fails if current matches differ from baseline.
- Any new or moved `explicit any` requires either:
  - refactor to remove `any`, or
  - explicit baseline update in a dedicated debt ticket.

## Operational Contract
- Baseline updates are not allowed as incidental changes.
- Baseline update commit must reference dedicated ticket and include rationale.
