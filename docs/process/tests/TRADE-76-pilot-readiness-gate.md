# TRADE-76 Pilot Readiness Gate

Date: 2026-03-19  
Scope: TRADE-71 pilot scenario for Agent Cockpit (`quasi-linear` + `multiple_agents`).

## Pass/Fail Matrix

| Gate | Check | Status | Evidence |
|---|---|---|---|
| G1 | Pipeline selection is mandatory at intake | PASS | `src/runtime/PipelineSelector.ts`, `AGENTS.md` |
| G2 | Mutations on `main/master` are blocked | PASS | `scripts/git/main_branch_guard.sh` |
| G3 | Preflight token is required for mutating work | PASS | `scripts/git/preflight_guard.sh`, runtime guards |
| G4 | Resume blocks on pipeline state mismatch | PASS | `src/runtime/PipelineStateService.ts`, tests |
| G5 | Plane lifecycle handoff sync is emitted per stage | PASS | `src/runtime/PlaneLifecycleOrchestrator.ts` |
| G6 | Git closure automation exists (preflight -> cleanup -> audit) | PASS | `scripts/git/closure_orchestrator.sh` |
| G7 | Agent/skill policy drift is CI-detectable | PASS | `src/tools/lintAgentGuards.ts` |

## Must-Pass Checklist
- [x] All gates G1..G7 are PASS
- [x] No known blocker in mandatory governance path
- [x] Branch/worktree audit contract is defined and executable
- [x] Override path for emergency main ops is documented and traceable

## Go/No-Go Decision
- Decision: GO (pilot can proceed)
- Conditions:
- Keep runtime on ticket-scoped worktrees only
- Keep Plane handoff comments enabled for pilot runs

