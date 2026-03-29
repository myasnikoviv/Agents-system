# Governance Layer Discovery & Runtime Policy Audit: KB Entry

## Executive Summary
This document summarizes the current state of the governance layer in the `agent-system` as of Sprint 6.

### Core Runtime Guards
- **Git Mutation Block** (`src/runtime/GitExecutionGuard.ts`): Strictly prevents mutations on `main`/`master`.
- **Preflight Tokens**: Runtime requires valid tokens in `docs/process/git/preflights/` matching the ticket and worktree.
- **Workbench Scheduling** (`src/runtime/AgentWorkbenchScheduler.ts`): Manages exclusive leases for `filesystem` and `figma` tools.
- **Intake Quality** (`src/runtime/IntakeGovernance.ts`): Scores requests (0-100) and blocks those below the threshold.

### Telemetry Linkage
- **Run Ledgers**: JSONL logs in `docs/process/runs/ledger/` link `runId` to `ticketId`, `role`, and `stage`.
- **Skill Telemetry**: `skill-usage.jsonl` tracks token counts and outcomes per skill usage, tied back to the ticket.

### Identified Gaps
- **Missing Scripts**: Mandatory PM scripts like `ticket_brief_gate.sh` and `pm_daily_audit.sh` are documented but missing from the `scripts/` directory.
- **Assumptions Gate**: No runtime enforcement or automated artifact generation currently exists for this gate.
