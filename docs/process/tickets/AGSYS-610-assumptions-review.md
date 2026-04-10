# AGSYS-610 Assumptions Review

- Ticket: AGSYS-610
- Pipeline: new-feature
- Stage: assumptions-review
- Approver: myasnikov.iv
- Approval Status: approved by owner request in chat
- Timestamp: 2026-04-09

## Assumptions
1. `PostgresControlPlaneStore` can be extended without breaking standalone mode.
2. Some local/sqlite paths must remain as compatibility default until full migration completes.
3. API consumers can accept explicit `source`/`default` metadata in responses.

## Risks
- Partial rollout may create inconsistent source precedence.
- Postgres unavailability handling could degrade UX if not explicit.

## Mitigations
- Canonical source precedence encoded in helper functions.
- Health + source metadata exposed in relevant APIs.
- Regression checks in both pg-enabled and default modes.
