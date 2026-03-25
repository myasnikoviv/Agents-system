---
ticket: AGSYS-217
type: assumptions-review
status: Open
---

# AGSYS-217: Assumptions Review for OpenHands Integration

## Proposed Assumptions
1. **SDK Dependency**: We assume OpenHands SDK is available via standard package managers (pip/npm) and can be easily bundled or pre-installed in the target environment.
2. **Execution Context**: We assume the current `CockpitPage` and `LangGraph` already have a generic `ExecutionProvider` interface that can be extended without breaking existing logic for Claude/Codex.
3. **Workspace Security**: We assume that OpenHands' default sandbox policy (Docker/Local) is compatible with our security requirements and doesn't require massive reconfiguration.
4. **Auth Persistence**: We assume that the existing `Configuration` screen can store the new `openhands_config` in the same way Claude/Codex configs are stored.
5. **Event Streaming**: We assume OpenHands SDK provides a stable event stream for file changes and tool calls that can be mapped to our internal UI.

## Evidence
- `openhands.md` explicitly mentions SDK mode as primary and existence of LLM providers/modes.
- Current architecture already supports multiple executors.

## Risks
- Unexpected breaking changes in OpenHands SDK (it's actively evolving).
- Compatibility issues with local Docker environments for workspace backend.
- High token usage/latency when using nested agent execution (agent-of-agents).

## Correctness/Confirmation
User: Pending
PM: Pending
