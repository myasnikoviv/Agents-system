---
id: SKILL-ENG-TEST-FIX
version: 1
status: draft
owner_roles: [Developer, TDD QA, Code Reviewer]
category: engineering
adoption: adapt
source_references: [Anthropic, Microsoft]
updated_at: 2026-03-18
---

# name
Test Fixing

# description
Diagnose failing tests and apply minimal safe fix path.

# when_to_use
Use when CI/local tests fail or become flaky.

# when_not_to_use
Do not mute failures by deleting assertions without root-cause analysis.

# inputs
Failure logs, recent diff, related test history.

# outputs
Root cause, fix patch, and anti-regression note.

# required_tools
Test runner, `git blame`, diagnostics logs.

# workflow
1. Classify failure (code bug, test bug, environment).
2. Reproduce minimally.
3. Fix root cause with smallest safe change.
4. Re-run focused and broader suites.

# validation_checklist
- [ ] Root cause documented.
- [ ] Fix verified locally.
- [ ] Regression guard preserved.

# common_failures
- Fixing test instead of bug.
- Ignoring flaky setup and timing assumptions.

# examples
- Scenario: failing queue diagnostics snapshot.
- Expected output: deterministic fix and stable assertion strategy.

# related_skills
- test-generation
- refactor

# project_specific_notes
If failure indicates contract drift, update manifests/migrations explicitly.
