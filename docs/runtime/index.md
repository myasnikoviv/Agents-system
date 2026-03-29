# Runtime Artifact Index (AGSYS-300)

## Purpose

Single index for all runtime formalization artifacts introduced in Sprint 0.5 and beyond.

## Runtime Contracts

| Artifact | Purpose | Owner Role | Last Updated |
|---|---|---|---|
| `docs/runtime/architecture.md` | End-to-end runtime architecture diagram | Solution Architect | 2026-03-29 |
| `docs/runtime/sequence.md` | Single-run lifecycle sequence | PM/Architect | 2026-03-29 |
| `docs/runtime/responsibility-map.md` | Component ownership matrix | PM/Architect | 2026-03-29 |
| `docs/runtime/event-ui-contract.md` | Event to UI deterministic mapping | PM/Design/Frontend | 2026-03-29 |
| `docs/runtime/rendering-rules.md` | Ordering and mixed-message prevention rules | PM/Frontend | 2026-03-29 |
| `docs/runtime/artifact-structure.md` | Canonical docs structure contract | PM/Docs | 2026-03-29 |
| `docs/runtime/index.md` | Runtime artifact registry index | Documentation Owner | 2026-03-29 |
| `docs/runtime/system-dod.md` | System-level Definition of Done | PM/QA | TBD |
| `docs/runtime/token-budget-limits.md` | Runtime cost guardrails | PM/DevOps | TBD |
| `docs/runtime/abort-rules.md` | Abort and stop policies | PM/Runtime | TBD |
| `docs/runtime/io-schema.md` | Input/output schema contract | PM/Runtime | TBD |

## Process Artifacts

- Ticket specs: `docs/process/tickets/`
- Postflight evidence: `docs/process/tests/`
- Pipeline continuity: `docs/process/pm/pipeline-state/`
- Git preflights: `docs/process/git/preflights/`

## Acceptance Mapping (`PM-S0.5-7`)

- index file exists -> this file.
- all artifacts listed -> runtime + process artifacts indexed above.
