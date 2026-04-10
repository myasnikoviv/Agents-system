---
ticket: AGSYS-217
type: new-feature
status: Open
pipeline: new-feature
---

# AGSYS-217: OpenHands SDK Integration as Execution Backend

## Description
Integrate OpenHands SDK into the Cockpit agent infrastructure as a third execution backend alongside Claude Code and Codex CLI. This will provide a model-agnostic execution runtime, reduce vendor-specific dependency, and unify shell/file/tool execution under a single abstraction layer.

## Objectives
1. **New Execution Target**: Add "OpenHands" to the Execution Target dropdown in Cockpit Settings.
2. **Configuration UI**: Implement "OpenHands Agent Configuration" block with fields:
   - Mode (SDK/CLI, default SDK)
   - LLM Provider (OpenHands, OpenAI, Anthropic, Mistral, Custom)
   - LLM Model (with search/manual input)
   - Base URL (optional)
   - Auth Mode (API Key, Subscription, Cloud Key)
   - Workspace Backend (Local, Docker, Remote)
3. **Authentication & Health**:
   - Implement "Refresh Provider Status", "Test OpenHands", and Login flows.
   - Secure storage for API Keys (no plain text in config).
4. **Backend Integration**:
   - Create `OpenHandsExecutionProvider` adapter.
   - Support SDK mode as primary (CLI as default).
   - Normalize errors and execution results into unified internal format.
5. **LangGraph Integration**:
   - Add `OpenHandsExecutorNode` to the orchestration graph.
   - Maintain compatibility with existing agent memory and telemetry.

## Acceptance Criteria
- "OpenHands" is selectable in Settings.
- Configuration can be saved and validated via Health Check.
- Smoke test execution successfully runs a simple task.
- LangGraph can successfully route tasks to OpenHands.
- Secrets are not logged or stored in plain text.

## Approvers
PM Orchestrator (Sokil-PM): Pending
User: Pending
