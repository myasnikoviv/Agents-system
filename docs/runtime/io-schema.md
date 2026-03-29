# Runtime Input/Output Schema (AGSYS-304)

## Purpose

Define strict runtime I/O envelopes so outputs are valid, parseable, and contract-enforced.

## Input Envelope (Run Request)

```json
{
  "threadId": "string",
  "projectId": "string",
  "mode": "mock|linear|multiple_agents",
  "message": {
    "id": "string",
    "role": "user",
    "content": "string",
    "timestamp": "ISO-8601"
  },
  "provider": {
    "id": "string",
    "model": "string"
  },
  "context": {
    "branch": "string|null",
    "worktree": "string|null",
    "ticket": "string|null"
  }
}
```

## Output Envelope (Assistant Message)

```json
{
  "runId": "string",
  "threadId": "string",
  "status": "completed|failed|cancelled",
  "assistant": {
    "role": "assistant",
    "content": "string",
    "format": "markdown"
  },
  "metrics": {
    "inputTokens": "number",
    "outputTokens": "number",
    "llmCalls": "number",
    "durationMs": "number"
  },
  "events": [
    {
      "eventId": "string",
      "type": "string",
      "timestamp": "ISO-8601"
    }
  ],
  "error": {
    "code": "string|null",
    "message": "string|null"
  }
}
```

## Validation Rules

1. Request and response envelopes must be valid JSON objects.
2. Unknown top-level keys are allowed only under `context.extensions` / `meta.extensions` namespaces.
3. `assistant.content` is mandatory when `status=completed`.
4. `error.message` is mandatory when `status=failed`.
5. `events` must be timestamp-sortable and include `eventId` + `type`.

## Acceptance Mapping (`PM-S0.5-11`)

- outputs valid -> schema and validation rules.
- JSON enforced -> input/output envelopes are JSON-first contracts.
