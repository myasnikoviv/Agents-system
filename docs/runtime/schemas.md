# Execution Contracts (Anti-Hallucination Layer)

## Purpose

To ensure that agent communication remains strictly structured and valid, preventing "format hallucinations" or unstructured free-text responses that break downstream tools.

## Input Schema (Generic)

All agent invocations must pass a structured context:

```json
{
  "runId": "uuid",
  "ticketId": "AGSYS-XXX",
  "pipeline": "string",
  "stage": "string",
  "context": {
    "files": ["path1", "path2"],
    "history": []
  }
}
```

## Output Schema (Strict JSON Enforcement)

Agents **MUST** respond in valid JSON format. Free-text "preambles" are forbidden and must be filtered by the `AgentExecutor`.

### Example Format:
```json
{
  "thought": "Internal reasoning of the agent",
  "action": "tool_call | respond_to_user | wait",
  "payload": {
    "tool": "name",
    "args": {}
  },
  "confidence": 0.0-1.0
}
```

## Validation & Fallback (PM-S0.5-11)

| Feature | Enforcement Mechanism |
| :--- | :--- |
| **Strict JSON** | Pydantic/Zod validation at the `AgentExecutor` boundary. |
| **Reject Invalid** | Responses missing required keys are rejected before reaching the `EventBus`. |
| **Auto-Retry** | If validation fails, the agent is retried once with a "Format Error" correction prompt. |
| **Hard Fail** | Second consecutive validation failure triggers a `RUNTIME_ERR_VALIDATION`. |

## Acceptance Mapping (PM-S0.5-11)

- `all responses valid` -> Enforcement via Schema Validation.
- `JSON enforced` -> Mandatory JSON mode in prompts + Zod parsing.

---
*Reference: [sprint0_5.md](file:///Users/myasnikoviv/development/agent-system/docs/process/roadmaps/pm-pack/sprint0_5.md)*
