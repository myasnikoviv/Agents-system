# Compliance Engine (Sprint 8) — As Built

## Delivered Components

- Task analyzer for pipeline/agent/skill detection:
  - `src/runtime/compliance/TaskAnalyzer.ts`
- Execution plan builder:
  - `src/runtime/compliance/ExecutionPlanBuilder.ts`
- Actual evidence collector from runtime events + skill telemetry:
  - `src/runtime/compliance/ComplianceEvidenceCollector.ts`
- Deterministic compliance evaluator:
  - `src/runtime/compliance/ComplianceEvaluator.ts`
- Compliance enforcement loop (single retry + deviation):
  - `src/runtime/compliance/ComplianceEnforcementLoop.ts`
- Compliance ledger writer (plan vs actual vs deviations):
  - `src/runtime/compliance/ComplianceLedger.ts`
- Shared compliance types:
  - `src/runtime/compliance/ComplianceTypes.ts`

## Runtime Integration

- Compliance pre-check is integrated in runtime execution router:
  - blocks run when execution plan is missing/incomplete (`plan_required`).
- Compliance post-check runs after graph execution:
  - collects actual evidence
  - evaluates required agents/pipeline/skills/stages
  - applies enforcement decision (`allow` / `retry` / `deviation`)
  - writes compliance ledger entry

Primary integration file:
- `src/runtime/graphs/RuntimeExecutionRouter.ts`

## Ledger Format

- Location: `docs/process/runs/compliance/<runId>.jsonl`
- Entry shape:
  - `runId`
  - `plan`
  - `actual`
  - `deviations`
  - `decision`
  - `ts`

## Validation

- Added Sprint 8 test suite:
  - `src/runtime/__tests__/sprint8_compliance_engine.test.ts`
- Covered:
  - analyzer output not empty
  - plan builder stage generation
  - retry limit behavior
  - compliance ledger writing
