# TKT-62 Design: Provider Diagnostics Hardening

## Objective
Make provider connectivity failures explicit and actionable for cockpit operators.

## Scope
- Shared OpenAI error classifier module.
- Health probe endpoint `GET /api/diagnostics/openai`.
- HTTP semantics:
  - `200` for healthy probe.
  - `200` with `auth` category when key is missing.
  - `503` for provider-side failure categories.

## Acceptance
1. Distinguish `auth` vs `insufficient_quota` vs `rate_limit`.
2. Return machine-readable category/message for UI and troubleshooting.
