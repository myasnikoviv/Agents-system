# Verification Gate Contract (Mandatory Before Done)

## Goal
Prevent ticket/sprint closure without reproducible CLI + UI verification evidence and enforce follow-up routing for unresolved gaps.

## Commands
1. `bash scripts/pm/verification_gate.sh <ticket>`
2. (optional explicit report) `bash scripts/pm/verification_gate.sh <ticket> <report-path>`

## Required Report
- Default path: `docs/process/tests/<ticket>.md`
- Must follow: `docs/process/tests/verification-report-template.md`

Required report sections:
1. `## CLI/API Checks`
2. `## UI Checks`
3. `## Gaps`
4. `- Overall Status: PASS|FAIL`

## Gate Outcome Rules
1. If `Overall Status != PASS` -> gate fails.
2. If `Gaps` section is not `none` -> gate fails.
3. On failure, script auto-creates follow-up draft:
   - `docs/process/tickets/followups/FOLLOWUP-<ticket>-<timestamp>.md`
4. Parent ticket must not move to `Done/Closed` until follow-up is resolved.

## Sprint Closure Binding
- `scripts/git/closure_orchestrator.sh` must execute verification gate in `MODE=apply`.
- If any verification gate fails, closure is blocked.
