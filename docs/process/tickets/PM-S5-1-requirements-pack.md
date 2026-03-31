# Intake Requirements Pack: PM-S5-1

## 1. Ticket Information
- **Ticket ID**: PM-S5-1
- **Title**: Event Stream Renderer (EPIC 16 - Live Execution Stream)
- **Pipeline**: new-feature
- **Epic**: EPIC 16 (Live Execution Stream / Thinking UI)
- **Type**: UI/UX, Frontend Component

## 2. Context & Problem Statement
Currently, the UI only displays the final response from the agent. There is no visibility into the intermediary "thinking stream" (e.g., tool calls, handoffs between agents, internal system thoughts). This creates a black box effect that contradicts the "Operator Mode" goal where the runtime execution should be fully transparent and stream progressively like Codex or Claude Desktop.

## 3. Scope of Work (What's Included)
- **Implement `StreamRenderer` component** on the frontend (Cockpit) that can parse and dynamically present SSE / WebSocket JSON events emitted by the agent engine.
- **Support Event Types:**
  - `system.thought` (internal agent reasoning/thoughts).
  - `tool.call` (when an agent uses a tool, e.g., view_file or run_command).
  - `swarm.handoff` (when passing control from PM to Researcher, etc.).
  - `agent.started` / `agent.message` (messages bounded by the agent instance).
- **Progressive UI Updating:** The rendering must not wait for the final message. It must append events progressively to the conversation feed.

## 4. Out of Scope (What's Excluded)
- Deep click actions and artifact parsing (covered by EPIC 17: Task 17.1-17.4).
- Custom badge styling for each message type (covered by PM-S5-2).
- Complete agent control panel rendering (covered by EPIC 18).

## 5. Dependencies
- Dependent on the backend event bus and execution wrapper (from Sprint 1 and 2) correctly emitting these event variants.
- The `Cockpit` frontend environment must have the capability to listen to the SSE/WS stream.

## 6. Acceptance Criteria
- [ ] UI properly handles and displays intermediate execution events incrementally.
- [ ] Events (`thought`, `tool.call`, `handoff`, `agent.message`) appear in order as a real-time stream.
- [ ] The user experiences the process and intermediate work instead of just waiting idly for the final block of text.

## 7. Hand-off Protocol
- **Research Agent**: to verify frontend/backend data transport schemas.
- **Architect**: to design the generic Event Component abstraction.
- **Design Lead (UI/UX)**: to determine the clean visual scaffolding.
- **Developer**: to implement the React components and hooks in the Cockpit repo.
- **TDD QA / Reviewer**: smoke tests for layout breaking and streaming.

---
**Status**: DRAFT (Awaiting Owner Approval)
