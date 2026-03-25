---
id: SKILL-ENG-DOC-UPDATE
version: 1
status: draft
owner_roles: [Documentation Owner, Developer, PM Orchestrator]
category: engineering
adoption: adapt
source_references: [Vercel, Anthropic]
updated_at: 2026-03-18
---

# name
Documentation Update

# description
Keep technical/process docs synchronized with accepted changes.

# when_to_use
Use after accepted implementation, architecture, or pipeline change.

# when_not_to_use
Do not update canonical docs before acceptance gate.

# inputs
Merged or accepted diff, design decisions, test evidence.

# outputs
Updated docs and change traceability.

# required_tools
`docs/` tree, ticket/design/run/review artifacts.

# workflow
1. Identify outdated docs.
2. Update minimal canonical sources.
3. Link evidence artifacts.
4. Verify consistency across related docs.

# validation_checklist
- [ ] No contradiction with code/contracts.
- [ ] References are up to date.
- [ ] Lifecycle labels remain valid.

# common_failures
- Editing too many docs without evidence.
- Leaving stale links and version notes.

# examples
- Scenario: contract version bump.
- Expected output: updated contract doc + release/test notes.

# related_skills
- knowledge-update
- retrospective

# project_specific_notes
Apply docs lifecycle rules from `docs/process/docs-lifecycle-labels.md`.
