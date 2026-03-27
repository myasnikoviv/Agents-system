# AGSYS-228 Requirements Pack

## Ticket
- ID: AGSYS-228
- Title: Swarm transparency + real agent runtime board (no fabricated ticket/status output)
- Pipeline: new-feature
- Owner: PM Orchestrator + Developer

## Problem Statement
Cockpit chat and swarm panel currently show mixed/fabricated status artifacts: synthetic thread-level ticket IDs, repeated PM-only responses, and non-transparent agent handoff visibility. The UI does not present a reliable real-time multi-agent runtime picture.

## Scope
1. Stop synthetic ticket/status output in chat responses when Plane ticket is not actually created.
2. Ensure runtime loop progresses beyond pm-entry and emits real stage handoff signals.
3. Propagate real stage lifecycle updates into chat (started/completed transitions).
4. Replace current swarm side panel behavior with an always-visible agent roster and live status per agent.
5. Expand swarm panel width and include current stage/task metadata for active agents.

## Out of Scope
- Creating real parallel sub-agent execution engine (new orchestration model).
- Refactoring all prompt contracts in common-agents repository.

## Acceptance Criteria
- No fake THREAD-* ticket appears in assistant content unless a real ticket exists.
- Querying tools/MCP no longer replays stale PM-entry text for unrelated follow-up prompts.
- Chat receives real stage lifecycle messages from SSE (stage.started / completion transitions).
- Swarm controller shows all discovered agents persistently with statuses: active, standby, unavailable.
- Right panel width increased and displays active stage/task per agent.

## Approval Traceability
- Approver: Owner (chat)
- Approval status: Approved
- Approved at: 2026-03-27
