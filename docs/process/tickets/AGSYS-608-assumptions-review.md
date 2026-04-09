# AGSYS-608 Assumptions Review

- Ticket: AGSYS-608
- Pipeline: new-feature
- Stage: assumptions-review
- Approver: myasnikov.iv
- Approval Status: approved by owner request in chat
- Timestamp: 2026-04-09

## Assumptions
1. Existing Postgres/Redis infra can be used for shared queue/state storage.
2. Incremental adapter-first migration is preferred over big-bang rewrite.
3. Existing runtime tests can be extended for duplicate-claim prevention.

## Risks
- In-flight compatibility between old local queue and new shared queue paths.
- Worker lease timeout tuning causing false reclaims.

## Mitigations
- Introduce interface boundary and default adapter.
- Add deterministic tests for claim/reclaim and duplicate suppression.
