# Pipeline Quality Telemetry Contract

## Objective
Standardize quality telemetry across all pipelines so PM can evaluate execution health, trigger RCA, and produce deterministic improvement tickets.

## Artifact Location
- Runtime event snapshot: `docs/process/pm/pipeline-state/<ticket-or-thread>.md`
- Quality telemetry artifact: `docs/process/retrospectives/<ticket>.md` section `Telemetry`

## Required Fields (per ticket run)
- `ticket_id`
- `pipeline_id`
- `pipeline_version`
- `run_started_at`
- `run_finished_at`
- `final_outcome` (`done|rework|blocked|escalated`)
- `active_roles[]`
- `handoff_count`
- `rework_loops`
- `failed_gates[]`
- `blocker_count`
- `blocker_recovery_attempts`
- `test_cli_status`
- `test_ui_status`
- `review_rounds`
- `git_drift_detected` (`true|false`)
- `worktree_cleanup_status`
- `quality_score` (0..100)
- `quality_verdict` (`pass|watch|fail`)

## Optional Diagnostic Fields
- `top_failure_classes[]`
- `time_in_stage{stage:seconds}`
- `agent_efficiency{role:score}`
- `rca_summary`
- `improvement_ticket_ids[]`

## Scoring Baseline
- Start score: 100
- Deduct:
  - failed hard gate: -20 each
  - blocker escalation after 3 retries: -15
  - missing UI/CLI evidence where required: -15
  - git drift incident: -10
  - extra review loop (>1): -5 each
- Clamp score to `0..100`

## Threshold Policy
- `pass`: `>=85`
- `watch`: `70..84`
- `fail`: `<70`

When verdict is `watch` or `fail`, PM must create an improvement ticket before closing sprint.
