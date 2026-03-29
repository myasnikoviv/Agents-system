# Contract vs Runtime Matrix: AGSYS-347

| Rule ID | Documented Requirement | Runtime Component / Script | Status | Notes |
|---------|-----------------------|----------------------------|--------|-------|
| PM-R1 | Mandatory Plane Ticket | `src/runtime/IntakeGovernance.ts` | Implemented | Local pack created. |
| PM-R2 | Canonical Brief Gate | `scripts/pm/ticket_brief_gate.sh` | **MISSING** | Script not found. |
| PM-R6 | Git Worktree Drift Audit | `scripts/git/worktree_audit.sh` | Implemented | Script exists. |
| GIT-R1 | No mutation on `main` | `src/runtime/GitExecutionGuard.ts` | Implemented | Hard block. |
| WB-L1 | Exclusive Tool Leasing | `src/runtime/AgentWorkbenchScheduler.ts` | Implemented | Lease management. |

(See full matrix in Sprint 6 Governance Audit files)
