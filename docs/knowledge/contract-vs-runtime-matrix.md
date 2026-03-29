# Contract vs Runtime Matrix: Governance Layer Audit

This matrix maps the documented governance rules and gates against their current implementation status in the `agent-system` runtime.

## 1. PM Orchestrator Rules (pm-orchestrator.md)

| Rule ID | Documented Requirement | Runtime Component / Script | Status | Notes |
|---------|-----------------------|----------------------------|--------|-------|
| PM-R1 | Mandatory Plane Ticket for every task | `src/runtime/IntakeGovernance.ts` | Implemented | `writeIntakeArtifact` creates a local pack; Plane MCP used for remote. |
| PM-R2 | Canonical Brief Gate (`scripts/pm/ticket_brief_gate.sh`) | `scripts/pm/ticket_brief_gate.sh` | **MISSING** | Script not found in repository. |
| PM-R3 | Auto-Prefix Active Titles (`scripts/plane/auto_prefix_active_titles.sh`) | `scripts/plane/auto_prefix_active_titles.sh` | **MISSING** | Script not found in repository. |
| PM-R4 | Daily Ticket Audit (`scripts/plane/pm_daily_audit.sh`) | `scripts/plane/pm_daily_audit.sh` | **MISSING** | Script not found in repository. |
| PM-R5 | Progress Router (`scripts/pm/progress_router.sh`) | `scripts/pm/progress_router.sh` | **MISSING** | Script not found in repository. |
| PM-R6 | Git Worktree Drift Audit (`scripts/git/worktree_audit.sh`) | `scripts/git/worktree_audit.sh` | Implemented | Script exists and is functional. |
| PM-G1 | Mandatory Postflight Validation Gate (UI/CLI) | `src/runtime/DynamicPipelineExecutor.ts` | Partial | `pre-pipeline-close` gates exist but enforcement binding is loose. |
| PM-G2 | Mandatory Service-Startup Verification Gate | `scripts/infra/startup_check.sh` | Implemented | Exists in `scripts/infra/`. |

## 2. Intake & Pipeline Gates (unified-task-intake.md)

| Gate ID | Documented Requirement | Runtime Component | Status | Notes |
|---------|-----------------------|-------------------|--------|-------|
| INT-G1 | LLM Intake Classification | `src/runtime/IntakeClassifier.ts` | Implemented | Supports explicit and heuristic classification. |
| INT-G2 | Quality Scoring (0-100) | `src/runtime/IntakeGovernance.ts` | Implemented | Threshold-based pass/block logic exists. |
| INT-G3 | Requirements Pack Creation | `src/runtime/IntakeGovernance.ts` | Implemented | `writeIntakeArtifact` produces `-intake-pack.md`. |
| INT-G4 | Assumptions Review Gate | N/A | **MISSING** | No dedicated runtime component or script found for this gate. |
| INT-G5 | Auto-RCA Pre-Intake Gate | `src/runtime/AutoRcaIntakeGate.ts` | Implemented | Exists in `src/runtime/`. |

## 3. Git & Mutation Guardrails

| Guard ID | Documented Requirement | Runtime Component | Status | Notes |
|----------|-----------------------|-------------------|--------|-------|
| GIT-R1 | No mutation on `main`/`master` | `src/runtime/GitExecutionGuard.ts` | Implemented | Hard block on main-branch mutations. |
| GIT-R2 | Mandatory Preflight Token per ticket | `src/runtime/GitExecutionGuard.ts` | Implemented | Checks `docs/process/git/preflights/*.env`. |
| GIT-R3 | Single-ticket branch/worktree isolation | `src/runtime/GitExecutionGuard.ts` | Implemented | Token-worktree binding is verified. |

## 4. Workbench & Tooling

| Mechanism | Documented Requirement | Runtime Component | Status | Notes |
|-----------|------------------------|-------------------|--------|-------|
| WB-L1 | Exclusive Tool Leasing (filesystem, figma) | `src/runtime/AgentWorkbenchScheduler.ts` | Implemented | Real queueing and lease management. |
| WB-L2 | Shared-Safe Tooling (plane) | `src/runtime/AgentWorkbenchScheduler.ts` | Implemented | Concurrent access allowed. |
| TL-T1 | Tool usage telemetry capture | `src/runtime/AgentExecutor.ts` | Implemented | Emits to `SkillTelemetryRegistry`. |
| TL-T2 | Persistent Ledger for every run | `src/runtime/RunLedger.ts` | Implemented | JSONL files in `docs/process/runs/ledger/`. |

## Summary of Critical Gaps

1. **Mandatory PM Scripts**: `scripts/pm/` and `scripts/plane/` directories are completely missing from the filesystem, yet they are declared as mandatory enforcement tools in the PM Orchestrator contract.
2. **Assumptions Review Gate**: No formal runtime requirement or automated artifact creation for the assumptions review gate.
3. **Closing Gate Enforcement**: `pre-pipeline-close` gates in `DynamicPipelineExecutor` are defined but lack direct hard-wired links to Postflight (UI/CLI) evidence verification rules.
