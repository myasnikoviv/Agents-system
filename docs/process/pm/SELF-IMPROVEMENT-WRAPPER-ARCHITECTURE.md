# Self-Improvement Wrapper Architecture (Global)

## Purpose
Provide a single architecture layer that wraps all major delivery pipelines and guarantees autonomous quality feedback with traceable artifacts.

## Scope
Applies to:
- `new-feature`
- `feature-change`
- `bug-fix`
- `hotfix`
- `refactor`
- `strategy-tuning`
- `release`
- `rollback-incident`
- `design-audit`
- `infrastructure-operations`

## Architectural Components
1. Wrapper Orchestrator (PM-owned)
- Entry/exit interceptor around pipeline stages.
- Maintains iteration counters and stage outcome map.

2. Telemetry Collector
- Collects execution facts from Plane, Git, QA, and Runner artifacts.
- Produces normalized quality snapshot per ticket.

3. Blocker Recovery Engine
- Detects hard blockers.
- Spawns linked blocker ticket.
- Runs up to 3 autonomous remediation attempts before escalation.

4. RCA Generator
- Builds root-cause narrative from failures and rework loops.
- Produces deterministic action items.

5. Improvement Proposal Generator
- Creates instruction/skill/pipeline evolution proposals.
- Enforces human `approve/reject` for critical policy changes.

## Integration Contract
- Every major pipeline must declare SIW dependency.
- Pipeline state artifact must include `siw_status` and `siw_artifacts`.
- Ticket cannot be closed unless SIW acceptance gate is passed.

## Quality Gates
- Gate A: telemetry completeness
- Gate B: blocker recovery evidence
- Gate C: RCA present for failed loops
- Gate D: improvement proposal created when thresholds violated

## Failure Policy
- Missing SIW data is a hard failure.
- PM must route task back to required stage (QA/Dev/Review/Git).
- Sprint closure is blocked until all SIW gates pass.
