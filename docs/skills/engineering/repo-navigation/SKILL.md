---
id: SKILL-ENG-REPO-NAV
version: 1
status: draft
owner_roles: [Developer, Code Reviewer, Solution Architect, PM Orchestrator]
category: engineering
adoption: adapt
source_references: [Anthropic, Vercel]
updated_at: 2026-03-18
---

# name
Repo Navigation

# description
Locate relevant files, symbols, entrypoints, tests, and integration boundaries quickly.

# when_to_use
Use before edits, review, refactor, and bug diagnosis.

# when_not_to_use
Do not use as a substitute for architecture or domain validation.

# inputs
Task statement, suspected modules, changed files.

# outputs
Relevant file set, symbol map, test map, risk notes.

# required_tools
`rg`, `rg --files`, `git status`, TypeScript/Jest config files.

# workflow
1. Find entrypoints and module roots.
2. Build symbol and dependency shortlist.
3. Locate test files and contract files.
4. Return impacted scope and unknowns.

# validation_checklist
- [ ] Includes source + tests + contracts.
- [ ] Includes runtime integration points.
- [ ] Distinguishes direct vs indirect dependencies.

# common_failures
- Missing non-obvious integration points.
- Ignoring migrations/schema files.

# examples
- Scenario: bug in strategy execution path.
- Expected output: list of runner, policy, processor, tests, and schema files.

# related_skills
- refactor
- test-generation
- architecture-review

# project_specific_notes
Include `docs/agents`, `docs/pipelines`, `src/engine`, `src/core`, and `docs/process` boundaries.
