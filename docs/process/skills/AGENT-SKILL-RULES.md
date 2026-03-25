# Agent Skill Rules (When To Use Which Skill)

Date: 2026-03-19
Source of truth in runtime: `src/runtime/SkillCatalog.ts`

## PM Orchestrator
- `pipeline-selection`: mandatory for every incoming request; avoid skipping unless this is an approved in-run continuation.
- `research-before-implementation`: use for medium/high complexity or cross-module work; avoid tiny isolated fixes.
- `architecture-review`: use when boundary/coupling risk exists; avoid no-impact changes.
- `retrospective`: use at closure; avoid before outcomes are known.
- `knowledge-update`: use for accepted decisions/lessons; avoid unverified claims.
- `skill-gap-detection`: use for recurring failures; avoid one-off issues.

## Research Agent
- `research-before-implementation`: use for options/constraints analysis.
- `market-structure-research`: use for swing/extrema/market-structure questions.
- `domain-ambiguity-detection`: use when requirement text is vague.
- `wave-logic-formalization`: use for turning wave intuition into rules.

## Trader Analyst
- `market-structure-research`: use for regime/setup analysis.
- `wave-logic-formalization`: use for deterministic wave rules.
- `domain-ambiguity-detection`: use for hidden assumptions.
- `strategy-validation`: use for strategy correctness verdict.
- `backtest-result-analysis`: use for causal run interpretation.

## Solution Architect
- `repo-navigation`, `architecture-review`, `research-before-implementation`, `runtime-inspection`.
- Use these when design/runtime boundaries are affected; avoid overuse on trivial isolated edits.

## Developer
- `repo-navigation`, `refactor`, `test-generation`, `test-fixing`, `documentation-update`, `runtime-inspection`.
- Use by trigger: scope discovery, structural change, behavior change, failing tests, accepted doc sync, runtime anomaly.

## Code Reviewer
- `repo-navigation`, `architecture-review`, `test-generation`, `test-fixing`, `retrospective`.
- Use for risk-first review and recurring quality signals.

## TDD QA
- `test-generation`, `test-fixing`, `strategy-validation`, `retrospective`.
- Use for behavior validation and leakage prevention.

## Runner Backtest
- `strategy-validation`, `backtest-result-analysis`, `runtime-inspection`.
- Use for gate decisions and execution anomaly diagnosis.

## DevOps Engineer
- `runtime-inspection`, `retrospective`, `knowledge-update`.
- Use across incident triage, postmortem, and runbook/knowledge hardening.

## Documentation Owner
- `documentation-update`, `knowledge-update`.
- Use only after acceptance/evidence gates.

## Git Flow Manager
- `repo-navigation`, `refactor` (scope/risk splitting), `documentation-update` (git policy docs).

## Knowledge Curator
- `retrospective`, `knowledge-update`, `skill-gap-detection`.

## Domain Validator
- `domain-ambiguity-detection`, `strategy-validation`, `market-structure-research`.

## Runtime behavior
At runtime, role skill selection is keyword-aware and returns up to 3 best-matching skills per request.
