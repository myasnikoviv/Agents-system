
# name
Backtest Result Analysis

# description
Analyze backtest outcomes by causal behavior, not just profitability.

# when_to_use
Use after each strategy tuning run and before promotion decisions.

# when_not_to_use
Do not use only summary PnL as decision basis.

# inputs
Backtest report, trade events, diagnostic traces.

# outputs
Causal analysis report with suspicious cases and recommendations.

# required_tools
Run reports, decision events, funnel projections.

# workflow
1. Segment results by regime and setup type.
2. Identify suspicious or low-confidence trades.
3. Trace entries/exits to rule path.
4. Recommend tuning, validation, or rollback actions.

# validation_checklist
- [ ] Includes causal trace samples.
- [ ] Includes false positive/negative review.
- [ ] Includes risk-oriented recommendation.

# common_failures
- Overfitting to one period.
- Ignoring unstable setup signatures.

# examples
- Scenario: PnL improved but drawdown worsened.
- Expected output: trade-level explanation and guarded next step.

# related_skills
- strategy-validation
- runtime-inspection

# project_specific_notes
Use canonical run artifacts in `docs/process/runs/` for evidence traceability.
