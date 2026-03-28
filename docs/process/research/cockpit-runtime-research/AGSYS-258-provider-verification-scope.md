# AGSYS-258 — Provider/Executor Verification Scope

Date: 2026-03-28  
Scope: Research only (no implementation)

## 1) Verified providers in current scope
- `codex-cli` execution path
- `openhands-sdk + gemini-2.5-flash` execution path

## 2) What must be verified for each provider
1. Availability and startup behavior
2. Response-format compatibility with contract guard
3. Tool-call rendering/parsing path
4. Error normalization to user-facing messages
5. Retry/backoff behavior under transient errors
6. Rate-limit behavior (429) and fallback semantics

## 3) Known environment constraints
- Provider quotas can trigger 429 and false-negative routing outcomes.
- Local runtime dependencies may differ per machine/session.
- OpenHands spawn/runtime requires explicit local service health.

## 4) Provider-specific differences to track
- Event payload shape differences (text chunks vs structured events)
- Header/role formatting differences
- Tool output encapsulation differences
- Error payload verbosity and leakage risk

## 5) Out-of-scope (for this sprint)
- Expanding to additional providers beyond two listed above.
- Benchmarking model quality beyond runtime correctness and stability.

## 6) Deliverable checklist
- Provider verification checklist template
- Fail-signature catalog per provider
- Normalized error taxonomy proposal

## 7) Stop condition
Research artifact only. No provider adapter refactor in this task.
