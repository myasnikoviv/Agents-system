# AGSYS-249 — Prompt Tracing / Export Design

Date: 2026-03-28  
Scope: Research design only (no implementation)

## 1) Problem statement
Current runtime has rich stage/event logging but lacks a dedicated, structured, queryable prompt trace record that captures "final payload sent to model" per stage/provider.

## 2) Design goals
1. Enable deterministic debugging of prompt composition and provider payload.
2. Keep user chat clean (no raw prompt dump in chat stream).
3. Support safe redaction and selective export for engineering analysis.

## 3) Proposed trace record schema (candidate)

```json
{
  "trace_id": "uuid",
  "run_id": "...",
  "thread_id": "...",
  "project_id": "...",
  "stage_id": "...",
  "agent_slug": "...",
  "provider": "codex-cli|claude-cli|openhands-sdk|langchain",
  "model": "...",
  "timestamp": "ISO8601",
  "system_prompt": "...",
  "user_prompt": "...",
  "history_excerpt": [...],
  "tools_bound": [...],
  "token_estimate": {"input": 0, "output": 0, "total": 0},
  "redaction": {"applied": true, "rules": ["..."], "fields_masked": ["..."]}
}
```

## 4) Where to log (storage options)
1. Redis stream channel (fast, ephemeral, runtime debug oriented)
- Pros: aligns with current event architecture.
- Cons: weaker long-term query and export ergonomics.

2. SQLite table (persistent local research/audit trail)
- Pros: consistent with cockpit persistence and easy local querying.
- Cons: needs schema/versioning decisions.

3. Hybrid (recommended)
- Emit lightweight prompt-trace event into Redis.
- Persist normalized trace rows into SQLite for debug mode sessions.

## 5) Export strategy
- Add debug endpoint to fetch traces by `run_id`, `thread_id`, and time window.
- Export formats: JSONL (default), optionally markdown summary.
- Keep export out of user chat; link from developer diagnostics panel.

## 6) Chat cleanliness policy
- Never inject raw prompt body into conversational message feed.
- Only expose high-level prompt metadata in runtime summary UI.

## 7) Security/redaction baseline
- Redact secrets/API keys by rule before persistence/export.
- Redact file blobs above size threshold; keep hashes/metadata.
- Store source references for reproducibility without leaking sensitive text.

## 8) Integration points (candidate)
- Hook after `ExecutionPayloadCompiler.compile(...)` and before adapter invoke.
- Attach usage metadata after provider response (if available).

## 9) Stop condition
Design artifact only. No tracing subsystem implementation performed.
