# AGSYS-239 Requirements Pack

## Goal
Stabilize cockpit swarm output UX and runtime board behavior for multi-agent mode.

## Acceptance Criteria
1. Contract output no longer fails due to prefixed free text before headers.
2. No duplicate final assistant message from mixed API and SSE paths in multiple_agents mode.
3. contract_fail events do not mark agent as unavailable in runtime board.
4. Right panel keeps Live/Controller/Summary sticky while board scrolls.
5. Board is sorted by status priority: unavailable, active, standby.
