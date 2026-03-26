
# name
Domain Ambiguity Detection

# description
Detect hidden assumptions and ambiguous domain statements before implementation.

# when_to_use
Use during intake, research, and before design approval.

# when_not_to_use
Do not use for already formalized and approved invariant sets.

# inputs
Task wording, strategy intent, acceptance criteria.

# outputs
Ambiguity report and clarification questions.

# required_tools
Ticket/design docs, domain notes, prior decisions.

# workflow
1. Parse domain claims and implicit terms.
2. Detect undefined boundaries and conflicting interpretations.
3. Produce clarification set.
4. Update problem statement with resolved assumptions.

# validation_checklist
- [ ] Ambiguities are concrete.
- [ ] Clarifications are answerable.
- [ ] Resolved assumptions are traceable.

# common_failures
- Treating ambiguity as implementation detail.
- Missing time-frame and source-of-truth ambiguity.

# examples
- Scenario: "strong retrace" without numeric definition.
- Expected output: numeric threshold proposal and alternatives.

# related_skills
- research-before-implementation
- market-structure-research

# project_specific_notes
Use before any change that affects wave, effort, or entry/exit semantics.
