# TKT-68 Research Report: LangGraph Fit-Gap for Autonomous Cockpit

Date: 2026-03-19
Owner: Research Agent

## Objective
Validate whether target autonomous scenario can be implemented by leveraging LangGraph-native capabilities (not replacing agent docs/skills/pipelines with rigid custom algorithms).

## Sources (official)
- LangGraph MCP integration guide: https://langchain-ai.github.io/langgraph/agents/mcp
- LangGraph human-in-the-loop and interrupt patterns: https://langchain-ai.github.io/langgraph/how-tos/human_in_the_loop/review-tool-calls/
- Multi-agent network/supervisor patterns: https://langchain-ai.github.io/langgraph/how-tos/multi-agent-network-functional/ and https://langchain-ai.github.io/langgraphjs/reference/modules/langgraph-supervisor.html
- Checkpoint semantics and resume guarantees: https://langchain-ai.github.io/langgraphjs/reference/modules/langgraph-checkpoint.html

## Current System Snapshot
- Cockpit supports run modes (`mock`, `linear`, `multiple_agents`) and event feed.
- Runtime has role graph with stage events and approval interrupts.
- Pipeline-selection guard exists and is returned in chat API response.
- Governance layer (AGENTS, skills, pipeline state contract, CI guards) is now enforced.

## Fit Assessment
### Strong fit (available natively in LangGraph)
1. Multi-agent orchestration via graph/supervisor patterns.
2. Human-in-the-loop interrupts/approvals.
3. Durable execution and thread checkpoint resume.
4. MCP tool usage through adapters in agent loops.

### Partial fit (needs integration work)
1. Full role-by-role tool loop (currently partial; research worker is delegated, others mostly prompt-only).
2. Persisted pipeline state lifecycle tied to runtime checkpoint thread + ticket context.
3. Deterministic handoff contract (artifact + next action) enforced at runtime, not only docs.
4. Plane ownership/state transitions per stage.
5. Git closure lifecycle orchestration per completed ticket wave.

### Gaps to close for target scenario
1. Runtime tool execution shell per role (with policy guardrails).
2. Handoff middleware to enforce evidence contract.
3. Plane sync orchestrator for owner/state/comment transitions.
4. Git finalization orchestrator (preflight, merge, cleanup sweep, audit).
5. Resume manager to restore pipeline stage from state card/checkpoint automatically.

## Recommendation
Do NOT re-encode business instructions into hardcoded algorithm trees.
Use LangGraph as orchestration shell and keep agent docs/skills/pipelines as governance source-of-truth.

## Proposed Next Step (Architect Challenge)
Architecture workshop should decide:
1. Runtime contract for role tool loop (MCP + filesystem + git + plane).
2. Pipeline-state persistence model (thread checkpoint + file artifact + ticket link).
3. Stage completion contract (required outputs per stage).
4. Rollout plan in 3 waves: orchestration shell -> lifecycle closure -> pilot E2E.

## Decision Support Verdict
- Scenario is feasible with current direction.
- Major blockers are integration and lifecycle orchestration, not model capability.
- Recommended: proceed with `TRADE-67` workshop and finalize `TRADE-69` business architecture baseline before implementation execution.
