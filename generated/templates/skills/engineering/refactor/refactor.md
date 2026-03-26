
# name
Refactor

# description
Apply structural changes without behavior regression.

# when_to_use
Use for decomposition, cleanup, naming consistency, dependency decoupling.

# when_not_to_use
Do not use for feature expansion without explicit feature scope.

# inputs
Current behavior, target structure, risk assumptions.

# outputs
Patch, risk report, regression evidence.

# required_tools
`git diff`, tests, lint/type checks.

# workflow
1. Establish pre-checklist and guard assertions.
2. Refactor in small verified steps.
3. Run regression and contract checks.
4. Record dependency impact.

# validation_checklist
- [ ] Pre-checklist completed.
- [ ] Post-checklist completed.
- [ ] No contract/schema drift.

# common_failures
- Hidden behavior changes.
- Over-scoped refactor in one patch.

# examples
- Scenario: split monolithic runner into composable phases.
- Expected output: equivalent behavior with clearer module boundaries.

# related_skills
- repo-navigation
- test-generation
- architecture-review

# project_specific_notes
For block contracts, version bump + manifest sync are mandatory.
