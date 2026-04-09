# AGSYS-609 Assumptions Review

- Ticket: AGSYS-609
- Pipeline: new-feature
- Stage: assumptions-review
- Approver: myasnikov.iv
- Approval Status: approved by owner request in chat
- Timestamp: 2026-04-09

## Assumptions
1. Existing Postgres control-plane storage can store runtime snapshots/audit metadata for cutover.
2. Compatibility mode is required while local FS artifacts still exist.
3. Migration can proceed endpoint-by-endpoint with reversible fallback.

## Risks
- Partial cutover may produce mixed-source reads.
- Latency differences between local file and centralized store.

## Mitigations
- Explicit source field in API responses.
- Centralized-first read order with guarded fallback.
- Regression tests on key telemetry/audit endpoints.
