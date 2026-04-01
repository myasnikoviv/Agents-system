# AGSYS-438 Change Triage (2026-04-01)

Context:
- Branch: `codex/AGSYS-438-audit-remediation-baseline`
- Goal: safely separate valid remediation work from generated/out-of-scope artifacts.

## Bucket A — Commit now (ticket-safe baseline artifacts)

1. `docs/process/git/preflights/AGSYS-438.env`
2. `docs/process/pm/pipeline-state/AGSYS-438.md`
3. `docs/process/audit/master-audit-pack.md`
4. `docs/process/audit/sprint-0.5-to-5-consolidated-report-2026-04-01.md`
5. `docs/process/audit/AGSYS-438-change-triage-2026-04-01.md`

Rationale:
- These files create required audit/preflight traceability.
- They are directly aligned with AGENTS governance gates and AGSYS-438 scope.

## Bucket B — Keep in branch, split into follow-up ticket commits (in-scope Sprint 6.1 remediation)

Modified runtime/governance files:
- `src/runtime/AgentExecutor.ts`
- `src/runtime/events/EventBus.ts`
- `src/runtime/events/types.ts`
- `src/runtime/governance/AgentParticipationEnforcer.ts`
- `src/runtime/governance/CostTrackerEnforcer.ts`
- `src/runtime/governance/GovernanceLogger.ts`
- `src/runtime/governance/ImprovementLoopEnforcer.ts`
- `src/runtime/governance/PipelineUsageEnforcer.ts`
- `src/runtime/governance/PostflightEnforcer.ts`
- `src/runtime/governance/PreflightEnforcer.ts`
- `src/runtime/graphs/PilotQuasiLinearGraph.ts`
- `src/runtime/pm/engine/GovernanceLoopEngine.ts`
- `src/runtime/__tests__/governance_gates.test.ts`

Rationale:
- These are valid remediation candidates, but belong to implementation tickets (AGSYS-439..447), not pure AGSYS-438 preflight setup.
- Should be split by concern before merge (event schema, retry contract, governance telemetry, tests).

## Bucket C — Do not commit (generated or duplicate-import artifacts)

1. `docs/runtime/governance/logs/*.jsonl`
   - Generated test/runtime logs.
2. `master-audit-pack.md`
3. `master_audit_pack.md`
   - Duplicate root copies; canonical artifact is under `docs/process/audit/master-audit-pack.md`.

## Recommended next execution order

1. Commit Bucket A as AGSYS-438 baseline.
2. Move Bucket B into dedicated ticket branches/commits by concern:
   - AGSYS-439/440: event schema + UI parity changes.
   - AGSYS-442: retry policy unification.
   - AGSYS-443/444: wrapper + schema enforcement path.
   - AGSYS-446: QA evidence contract tests.
3. Drop or ignore Bucket C from VCS history.
