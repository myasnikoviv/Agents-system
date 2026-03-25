# DEV-812: Plane MCP Server for Agent-Friendly Ticket Operations

## Type
New Feature

## Priority
high

## Owner
- Primary: `Кодоковаль (Developer)`
- Support: `Майстер Креслень (Solution Architect)`, `Техно-Рятівник (DevOps Engineer)`, `Вартовий Якості (Code Reviewer)`
- Requestor: `Сокіл-Координатор (PM Orchestrator)`

## Context / Problem
Agents currently need verbose/manual Plane interactions. A dedicated MCP server is required to simplify ticket operations and enforce governance defaults.

## Scope
- Design and implement MCP server for Plane operations.
- Provide tools for create/update/assign/move/handoff comment actions.
- Encode ticket-first and preflight checks in tool-level guardrails.
- Add docs and usage examples for agent roles.

## Out Of Scope
- Replacing Plane itself.
- Non-Plane task tracker integrations.

## Expected Pipeline (Mandatory)
1. PM Orchestrator
- Artifact: finalized problem statement and acceptance criteria.
- Handoff condition: scope and guardrails approved.
2. Research Agent
- Artifact: protocol and API best-practice brief.
- Handoff condition: approach recommendation accepted.
3. Solution Architect
- Artifact: technical design (`docs/process/designs/<id>.md`).
- Handoff condition: architecture approved.
4. TDD QA
- Artifact: failing tests for MCP tools behavior/guards.
- Handoff condition: red tests ready.
5. Developer
- Artifact: MCP server implementation + passing tests.
- Handoff condition: feature complete with evidence.
6. Code Reviewer
- Artifact: review report with risk assessment.
- Handoff condition: no unresolved high-risk findings.
7. DevOps Engineer
- Artifact: runtime/deployment notes and env contract.
- Handoff condition: local runbook validated.
8. Documentation Owner
- Artifact: usage docs and operation playbook.
- Handoff condition: docs accepted.
9. PM Orchestrator
- Artifact: final accept/rework decision.

## Dependencies
- Plane runtime available (`OPS-905`).
- Governance baseline updates (`PM-803`, `GIT-606`).

## Acceptance Criteria
1. MCP server exposes ticket lifecycle primitives for Plane.
2. Handoff operation enforces evidence fields.
3. Implementation blocks state transition when preflight note is missing for mutating tasks.
4. Usage docs include role-based examples and failure modes.

## Evidence Required
- Test report.
- Review report.
- Demo command transcript.
- Docs update links.

## Status
- State: `Backlog`
- Current owner: `Сокіл-Координатор (PM Orchestrator)` (pre-implementation orchestration)

## Readiness Notes
- Plane runtime dependency (`OPS-905`) is now satisfied.
- API bootstrap is still missing for automated ticket operations:
  - `PLANE_API_TOKEN` is not configured
  - `PLANE_PROJECT_ID` is not configured

## Next Handoff
- `PM -> Research Agent`: API contract and MCP tool surface brief.
