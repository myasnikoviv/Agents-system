# AGSYS-28 — GSD Intake Trigger Audit

## Context / Problem
GSD-style clarification flow is expected in runtime, but real sessions often bypass clarification and jump directly into execution.

## Scope
- Audit current intake gate behavior in chat API.
- Add deterministic clarification trigger for complex requests that lack structured intake details.
- Return explicit clarification payload in blocked response.

## Acceptance Criteria
- Complex, underspecified request returns `422` with `stage=clarification_required`.
- Response includes a machine-readable clarification payload (`questions`, `instructions`).
- Intake governance tests cover the complex-request trigger.

## Expected Pipeline
- `pipeline=bug-fix`
- stages: intake -> implement -> verify -> review -> git -> docs

## Gate
- Intake governance unit tests pass.
- Preflight token exists and matches branch/worktree.
- Plane ticket AGSYS-28 contains evidence comment with commit/test output.

