
# name
Test Generation

# description
Generate unit/integration/regression tests from code and contract changes.

# when_to_use
Use after logic or contract changes; before review handoff.

# when_not_to_use
Do not replace domain validation with shallow happy-path tests.

# inputs
Diff, target behavior, edge cases, known failures.

# outputs
New/updated tests and scenario matrix.

# required_tools
Jest config, fixture helpers, strategy schemas.

# workflow
1. Extract behavior changes from diff.
2. Add success, failure, and edge-path tests.
3. Add regression guard tests for prior bugs.
4. Verify deterministic assertions.

# validation_checklist
- [ ] Covers edge cases.
- [ ] Covers failure scenarios.
- [ ] Includes regression intent per test.

# common_failures
- Brittle assertions.
- Missing invariants in integration tests.

# examples
- Scenario: update wave retrace selection semantics.
- Expected output: unit + integration tests for old bug and new behavior.

# related_skills
- test-fixing
- strategy-validation

# project_specific_notes
Include backtest-related checks when change touches candidate queue, trades, or policy gates.
