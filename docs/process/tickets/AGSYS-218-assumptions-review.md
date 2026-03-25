# AGSYS-218 — Assumptions Review

## Evidence-Backed Assumptions
1. **History Persistence**: We assume that adding the `messages` array to the LangGraph state and storing it in the `checkpointer` (MemorySaver) is sufficient for multi-turn history.
    - *Evidence*: `MemorySaver` is designed for thread-level state persistence.
2. **Prompt Injection**: We assume that `fullInstructions` from `AgentDefinition` contains the complete markdown required for high-fidelity behavior.
    - *Evidence*: `AgentFactory.loadAgent` extracts the entire file content into this field.
3. **Skill UI**: We assume that adding `repo-navigation` to `pm-orchestrator` will automatically make the tools available in the LangChain/OpenHands loop.
    - *Evidence*: `SkillCatalog.ts` is the central registry used by `AgentExecutor`.

## Owner Corrections / Confirmation (Pending)
- [ ] Confirmed history strategy?
- [ ] Confirmed system prompt format?
- [ ] Confirmed skill assignment?

## Approval Gate
- Author: PM Orchestrator
- Timestamp: 2026-03-24
- Status: PENDING_REVIEW
