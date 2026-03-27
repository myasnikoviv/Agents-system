# AGSYS-223 Assumptions Review

## Ticket
- ID: `AGSYS-223`
- Pipeline: `refactor`

## Assumptions
1. Bootstrap instability is caused by stale hardcoded pipeline/stage in proof entrypoint and weak guards in assembler.
2. `MemoryHydrator` flow is already wired via RoleActivator and does not require schema changes for this ticket.
3. Improving guardrails in assembler is acceptable under run-bootstrap scope.

## Validation Plan
- Add explicit guard checks in `RunContextAssembler.assemble`.
- Update proof bootstrap to discovered pipeline + initial stage.
- Run `npm run verify` and record output.

## Risks
- Other scripts may still assume legacy stage IDs.
- Env/Redis availability can still affect end-to-end proof in CI.

## Approval Traceability
- Approver: Owner (chat)
- Approval status: Approved
- Approved at: 2026-03-28T00:22:13+01:00
