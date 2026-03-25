# AGSYS-38 — MCP Runtime Modes and Lock Queue

## Context / Problem
Shared MCP resources can collide across parallel agents because runtime lacks tool-mode policy (isolated/share-safe/exclusive) and queue-based locking semantics.

## Scope
- Introduce runtime classification for tools: `isolated`, `share-safe`, `exclusive`.
- Add lock queue for exclusive tools with acquisition/release semantics.
- Expose lock status for observability via cockpit API.

## Acceptance Criteria
- Exclusive tools cannot be acquired by multiple active holders.
- Waiting requests are queued and can be promoted when lock is released.
- Share-safe tools allow parallel acquisition.
- Isolated tools are always available (per-session isolation assumption).
- API exposes current holders/queue for each tool.

## Expected Pipeline
- `pipeline=new-feature`
- stages: intake -> developer -> qa -> reviewer -> git -> docs

## Gate
- Preflight token valid for branch/worktree.
- Targeted unit tests for lock queue behavior pass.
- Runtime endpoints provide deterministic lock state.
