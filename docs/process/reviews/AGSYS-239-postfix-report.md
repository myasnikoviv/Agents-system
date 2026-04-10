# AGSYS-239 Postfix Report

Date: 2026-03-28
Ticket: AGSYS-239
Status: Done

## Scope

Close handoff-observability/runtime-context bug and remove hard coupling to a single agents-docs root.

## Changes Implemented

1. Real handoff telemetry
- Added explicit `swarm_handoff` event emission in the runtime graph for real agent transitions.
- Covered both status-chain flow and regular pipeline stage-to-stage transitions.

2. Chat rendering for handoffs
- Cockpit chat now parses `swarm_handoff` payload and prints human-readable handoff messages.
- Frontend event payload typing updated to include handoff fields.

3. Project-level agent context source
- Added `agentContextPath` to cockpit project model and persistence.
- Added SQLite migration path for `cockpit_projects.agent_context_path`.
- Runtime now resolves discovery context from project-specific `agentContextPath` instead of global CWD.

4. New project creation contract
- “Add project” modal now requires:
  - project/worktree directory (absolute path),
  - agent files directory (absolute path).
- Backend validates agent files directory:
  - directory exists,
  - `AGENTS.md` exists in that directory.

5. Legacy manifest path compatibility
- Discovery service now supports default remap for legacy manifest refs like `./common-agents/...` when external agents root is configured.
- This removes hard fail behavior after decoupling into separate repos.

## Verification

- `npm --prefix frontend run build` -> PASS.
- Runtime proof script produces final successful audit markers.

## Known Follow-up (Not in AGSYS-239 Scope)

- `npm run verify` may leave dangling `final_agentic_proof.ts` processes due to open handles. This requires separate stabilization ticket.

