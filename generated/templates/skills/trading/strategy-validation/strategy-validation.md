
# name
Strategy Validation

# description
Validate strategy logic against formal rules, contracts, and runtime setup.

# when_to_use
Use before merge/release for strategy-related changes.

# when_not_to_use
Do not rely only on PnL deltas for validation.

# inputs
Strategy config, invariants, test/backtest evidence.

# outputs
Validation verdict with failure reasons and remediation steps.

# required_tools
Contracts, strategy schemas, backtest reports, tests.

# workflow
1. Verify contract and schema alignment.
2. Verify invariant-level behavior through tests.
3. Verify backtest scenario consistency.
4. Emit pass/fail with evidence.

# validation_checklist
- [ ] Contracts/schema aligned.
- [ ] Invariants are covered by tests.
- [ ] Backtest evidence includes edge cases.

# common_failures
- Good PnL masking invalid behavior.
- Validation without adverse scenarios.

# examples
- Scenario: updated stop/entry logic.
- Expected output: validated behavior with explicit failed-case review.

# related_skills
- backtest-result-analysis
- wave-logic-formalization

# project_specific_notes
Must include analysis of false positives/negatives, not only aggregate metrics.
