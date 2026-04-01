# Assumptions Review: PM-S5-5 & PM-S5-6

## Assumptions
1. **Delegation Tracking**: A `swarm_handoff` event payload contains `fromAgentId` / `fromAgentTitle` and `toAgentId` / `toAgentTitle`. I can track the delegation origin of `toAgentTitle` based on `fromAgentTitle`!
2. **Current State Format**: `AgentRuntimeStatus` is currently stored in `setAgentRuntime` mapping slugs to status.
3. **Mocking**: The Pause/Resume feature requires backend support. The acceptance criteria `кнопка Pause/Resume (mock)` explicitly allows an alert/mock action until the backend is wired.
4. **Visibility**: Since the side panel exists, I will render sub-agents slightly indented or with a "delegate ->" badge inside the card. Pause/Resume will also appear in the card.

## Implementation Steps
- Add `delegatedFrom: string | null` and `isPaused: boolean` to `AgentRuntimeStatus` in `CockpitPage.tsx`.
- On `swarm_handoff`, set `delegatedFrom` of the receiving agent to the sender agent.
- Add "Pause" / "Resume" buttons to the UI mapping over `agentStatusRows`.
- Toggle the `isPaused` flag (mock function) when clicked.

## Sign-off
Owner status: Approved (auto)
