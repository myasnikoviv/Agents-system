---
id: SKILL-ENG-ARCH-REVIEW
version: 1
status: draft
owner_roles: [Solution Architect, Code Reviewer, PM Orchestrator]
category: engineering
adoption: adapt
source_references: [Microsoft, Anthropic]
updated_at: 2026-03-18
---

# name
Architecture Review

# description
Evaluate design choices for layering, coupling, and runtime safety.

# when_to_use
Use before major refactors, new features, and runtime integration changes.

# when_not_to_use
Do not use as a replacement for implementation-level tests.

# inputs
Design proposal, impacted modules, constraints.

# outputs
Risks, accepted trade-offs, and required guardrails.

# required_tools
Architecture docs, dependency graph, contracts.

# workflow
1. Validate layer boundaries.
2. Check dependency direction and coupling risks.
3. Verify runtime and observability implications.
4. Propose enforceable guardrails.

# validation_checklist
- [ ] Boundary violations identified.
- [ ] Dependency risks classified.
- [ ] Guardrails mapped to tests/checks.

# common_failures
- Deferring critical coupling debt.
- Missing runtime-state impacts.

# examples
- Scenario: adding new runtime worker.
- Expected output: approved structure with explicit guardrails.

# related_skills
- research-before-implementation
- runtime-inspection

# project_specific_notes
Cross-check with Redis + LangGraph + Plane interaction points before approval.
