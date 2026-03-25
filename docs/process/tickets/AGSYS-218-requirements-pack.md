# AGSYS-218 — Refine Agent Routing and History Persistence

## Context / Problem
- Currently, conversational agents in LangGraph do not persist message history correctly across turns, leading to "amnesia" during follow-up questions.
- Agent prompts are inconsistently applied across different executors (CLI vs OpenHands).
- The PM Orchestrator lacks filesystem navigation context, making it hard to answer project-specific questions.

## Scope
- **Included**:
    - LangGraph `conversationalNode` refactor.
    - Server-side response extraction fix.
    - Unified prompt injection for OpenHands.
    - Skill assignment for PM Orchestrator.
- **Excluded**:
    - Changing the overall graph topology (leaving for future "Dynamic Discovery" task).

## Acceptance Criteria
1. Conversational agents (PM) correctly use `state.messages` history for context.
2. OpenHands backend receives `fullInstructions` markdown content as the system prompt.
3. PM Orchestrator can use `repo-navigation` (ls, cat) to provide project context.
4. Server returns the assistant's direct response in the chat payload.

## Expected Pipeline
1. PM (brief and acceptance lock) -> **Current Stage**
2. Git Flow Manager (git preflight)
3. Developer (implementation)
4. TDD QA (smoke tests)
5. PM (final accept)

## Git Preflight
- Expected branch: `feature/AGSYS-218-routing-persistence`
- Required preflight token path: `docs/process/git/preflights/AGSYS-218.env`
