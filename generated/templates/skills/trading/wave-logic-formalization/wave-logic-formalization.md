
# name
Wave Logic Formalization

# description
Convert wave/retrace intuition into explicit invariants and machine-checkable rules.

# when_to_use
Use before implementing wave-related processors or changing contracts.

# when_not_to_use
Do not ship wave-rule changes without formalized invariants.

# inputs
Domain rule drafts, existing processor behavior, observed anomalies.

# outputs
Invariant set, acceptance conditions, invalid cases.

# required_tools
Current wave-related tests, processors, and contracts.

# workflow
1. List intuitive rule statements.
2. Translate into invariant predicates.
3. Define positive/negative fixtures.
4. Hand off to test-generation and strategy-validation.

# validation_checklist
- [ ] Invariants are unambiguous.
- [ ] Includes failure/exception conditions.
- [ ] Maps each invariant to tests.

# common_failures
- Invariants depend on implicit context.
- Missing tie-break rules.

# examples
- Scenario: retrace anchor tie handling.
- Expected output: deterministic rule with unit tests.

# related_skills
- strategy-validation
- test-generation

# project_specific_notes
Synchronize with schema/manifest versioning rules on contract change.
