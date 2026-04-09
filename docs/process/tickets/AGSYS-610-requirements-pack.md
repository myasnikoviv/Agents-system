# AGSYS-610 Requirements Pack

- Ticket: AGSYS-610
- Pipeline: new-feature
- Stage: requirements-pack
- Approver: myasnikov.iv
- Approval Status: approved by owner request in chat
- Timestamp: 2026-04-09

## Objectives
1. Make Postgres canonical control-plane persistence for config/state/audit metadata paths.
2. Reduce fallback ambiguity by making fallback modes explicit and non-primary.
3. Improve startup/recovery consistency across nodes.

## Acceptance Criteria
- Postgres is primary read/write for control-plane persistence where supported.
- Fallback policy is explicit and observable in API metadata/health.
- Validation evidence for second-node startup/recovery is documented.
