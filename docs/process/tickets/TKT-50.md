# TKT-50: LLM Hot-wiring & Agent Integration

## Status: In Progress
## Priority: High

## Description
Connect the LangGraph "Pilot" nodes to real LLM backends and the project's Agent/Skill registry.

## Technical Requirements
1. **Agent Factory**: Component to instantiate agents based on `docs/agents/*.md` definitions.
2. **Skill Provider**: Mechanism to expose `docs/skills/` as callable tools for the agents.
3. **LLM Integration**: Securely wire OpenAI/Anthropic APIs via LangChain.
4. **Context Management**: Ensure agent memory from Redis is correctly injected into LLM prompts.

## Acceptance Criteria
- [ ] Research node produces real analytical output based on symbol/data.
- [ ] Architect node produces valid technical designs or code blocks.
- [ ] Agent thoughts and tool calls are visible in LangGraph Studio.
- [ ] `/api/chat` returns real AI responses.
