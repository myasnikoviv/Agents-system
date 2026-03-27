# AGSYS-224 Assumptions Review

## Ticket
- ID: `AGSYS-224`
- Pipeline: `refactor`

## Assumptions
1. Adapters already compile provider-agnostic payloads; remaining gap is executor/backend normalization in orchestration layer.
2. Contract normalization can happen in `AgentExecutor` without breaking existing adapters.
3. A lightweight adapter smoke is sufficient to verify context normalization.

## Validation Plan
- Add backend resolver in `AgentExecutor` from `RunContext.executionTarget`.
- Update context `executionTarget/provider/model` according to selected backend.
- Execute tsx smoke with injected adapter and assert normalized context output.

## Risks
- Existing callers relying on stale provider values may observe behavior changes.
- OpenHands mapping (`openhands` vs `openhands-sdk`) requires strict normalization.

## Approval Traceability
- Approver: Owner (chat)
- Approval status: Approved
- Approved at: 2026-03-28T00:29:07+01:00
