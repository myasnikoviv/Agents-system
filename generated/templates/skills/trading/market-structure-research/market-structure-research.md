
# name
Market Structure Research

# description
Research and formalize market-structure hypotheses for strategy design.

# when_to_use
Use when defining or revising structure, swing, and extrema logic.

# when_not_to_use
Do not use as a replacement for quantitative validation.

# inputs
Trading hypothesis, timeframe scope, sample assets.

# outputs
Formal assumptions, candidate rules, and uncertainty notes.

# required_tools
Historical data references, strategy docs, backtest context.

# workflow
1. Define hypothesis and boundaries.
2. Gather representative market scenarios.
3. Formalize structure rules and exceptions.
4. Produce testable rule candidates.

# validation_checklist
- [ ] Assumptions are explicit.
- [ ] Rules are testable.
- [ ] Edge regimes are considered.

# common_failures
- Vague narrative without rules.
- Ignoring regime shifts.

# examples
- Scenario: define trend continuation vs reversal boundaries.
- Expected output: rule table ready for strategy validation.

# related_skills
- wave-logic-formalization
- strategy-validation

# project_specific_notes
Tie findings to strategy contracts used by backtest engine.
