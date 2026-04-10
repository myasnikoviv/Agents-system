# Rendering Rules Contract (AGSYS-298)

## Purpose

Normalize cockpit rendering so mixed messages and ordering drift are impossible.

## Core Rendering Rules

1. `agent.message` renders only in main chat.
2. System/telemetry events (`stage.*`, `swarm.*`, `tool.*`, `guard.*`, `run.*`) render only in timeline/runtime board.
3. UI must never concatenate preamble/meta text with final assistant message.
4. One runtime event produces one render block.
5. Renderer is append-only by event time; no implicit merge of adjacent events.

## Ordering Rules

1. Primary order key: `timestamp` ascending.
2. Tie-breaker: monotonic `seq` (or `eventId` lexical default).
3. UI reordering after first paint is forbidden except explicit reconciliation of missing older chunks.
4. If out-of-order arrival happens, event is queued and inserted by ordering policy, with no chat text mutation.

## Mixed-Message Prevention

- Any response payload containing protocol header and unrelated free-text prelude must be split into:
  - timeline status note (if needed),
  - clean assistant chat message.
- Contract guard validates first line and strips non-contract prelude before display.

## Acceptance Mapping (`PM-S0.5-5`)

- no mixed messages -> rules and prevention section above.
- order = timestamp -> ordering rules above.
