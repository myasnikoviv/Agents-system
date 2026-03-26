# Progress Router Contract (Mandatory)

## Goal
Provide a deterministic PM continuation decision from one persisted artifact, so `continue/продовжуємо` cannot jump ad-hoc between stages.

## Command
- `bash scripts/pm/progress_router.sh <ticket-or-thread>`
- If argument is omitted, the command uses the most recently updated state card.

## Input Artifact
- `docs/process/pm/pipeline-state/<ticket-or-thread>.md`

## Output Contract
The command prints one report with:
1. current pipeline and phase (`plan|execute|verify|discuss`)
2. current stage and next stage
3. current owner and next owner
4. completed stage count
5. blocker presence flag
6. deterministic `next_action`

## Deterministic `next_action` Rules
1. If `Blocking Gates` is not `none`/`N/A`/`-` -> `resolve_blockers`
2. Else if `Next Stage == Current Stage` -> `advance_stage_update_state`
3. Else -> `handoff_to_next_owner`

## Required PM Behavior
1. Before any continuation action, PM runs progress router.
2. PM must paste router summary into [object Object] handoff comment or run report.
3. PM must update the same state card after each stage transition.
4. If state card is missing or invalid, execution is blocked until reconstructed.

## Acceptance Gate
- No ticket may be marked Done if continuation was performed without router report evidence.
