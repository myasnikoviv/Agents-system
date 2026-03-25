# Test Plan: Phase 7 — LLM Hot-wiring (TKT-50)

## Objective
Verify that agent roles are correctly instantiated from markdown definitions and can execute real logic via LLMs.

## Scenarios

### 1. Agent Factory Loading
- **Test**: Load `Research Agent` from `docs/agents/research-agent.md`.
- **Expected**: Personality and mission are correctly parsed.

### 2. Skill Injection
- **Test**: Map `docs/skills/research-agent-skill.md` to LangChain tools.
- **Expected**: Tools are registered with correct descriptions.

### 3. End-to-End Execution (Mock Provider)
- **Test**: Run `pilotGraph` with a mock LLM provider.
- **Expected**: Graph transitions from `intake` to `research` and the `research` node calls the LLM with the correct prompt.

### 4. End-to-End Execution (Live Provider)
- **Test**: Run a small research task with `linear` mode and live OpenAI/Anthropic API.
- **Expected**: Real analysis appears in `artifactLogs`.

## Evidence Required
- [ ] Unit test results for `AgentFactory`.
- [ ] Integration test logs for `pilotGraph` showing LLM interaction.
- [ ] Screenshot of LangGraph Studio showing a "Live" run.
