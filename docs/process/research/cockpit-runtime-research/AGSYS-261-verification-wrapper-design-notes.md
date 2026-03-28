# AGSYS-261 — Decoupled Verification Wrapper Design Notes

Date: 2026-03-28  
Scope: Research only (no implementation)

## 1) Problem
Need verification loop that is robust even when agent files/prompts evolve dynamically.

## 2) Decoupled wrapper concept
- Keep reusable runtime agents unchanged.
- Add outer verification wrapper that:
  - injects verification objective,
  - requests structured JSON output,
  - validates schema before passing result to PM.

## 3) Wrapper responsibilities
1. Input normalization (ticket, expected artifacts, required checks)
2. Prompt scaffolding for verification role
3. Output schema enforcement and repair attempt
4. Final normalized verdict object

## 4) Why decoupled
- Reduces hard dependency on specific agent-file wording.
- Supports dynamic agent-file updates without breaking verification contract.
- Keeps orchestration shell stable across provider/runtime changes.

## 5) Risks and mitigations
- Risk: model free-form output despite JSON requirement
  - Mitigation: bounded reformat pass + strict parser
- Risk: hidden missing evidence
  - Mitigation: explicit required-check list + fail-closed policy

## 6) Stop condition
Research artifact only. No wrapper coding in this task.
