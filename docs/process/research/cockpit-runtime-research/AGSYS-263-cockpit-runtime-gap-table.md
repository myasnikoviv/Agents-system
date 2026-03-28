# AGSYS-263 — Cockpit Runtime Gap Table

Date: 2026-03-28  
Scope: Final research consolidation (no implementation)

## 1) Gap summary table
| Area | Works now | Partial | Missing | Action Type |
|---|---|---|---|---|
| Runtime flow visibility | SSE + stage events | chat/event separation | clear run timeline authority | redesign + targeted fixes |
| Execution modes | mode routing exists | multiple_agents behavior ambiguous in edge cases | strict behavior guarantees | redesign + verification |
| Memory/isolation | base persistence layers present | some carryover edge handling | strict anti-leak guarantees | targeted fixes + tests |
| Prompt assembly | compiler/generator pipeline exists | limited observability | first-class prompt tracing/export | feature add |
| Guard/retry loops | guard + retry paths exist | boundedness not always transparent | deterministic loop ceilings | targeted fixes |
| Handoff/parallel proof | runtime board shows statuses | verification evidence inconsistent | stable multi-agent proof scenarios | test/observability upgrade |
| Provider consistency | adapters exist | formatting/errors differ | normalized UX/error layer | targeted fixes |
| PM package/verification | conceptual flow available | not machine-check strict | decoupled verifier contract | feature design |
| Clickable artifacts | basic markdown/text rendering | limited entity semantics | typed actionable entities | feature add |

## 2) What should be implemented vs adjusted vs redesigned
### Implement new capabilities
- Prompt tracing/export path
- Typed clickable entity pipeline
- Verification wrapper with machine-checkable schema

### Targeted adjustments
- Guard loop ceilings and dedupe
- Provider error normalization
- Event-to-chat filtering for user-safe output

### Redesign-level items
- Authoritative run timeline and final-message source model
- Explicit multi-agent handoff/parallel visibility contract

## 3) Final research sprint stop gate
Research sprint is complete after this artifact.  
No implementation should start without explicit approval of implementation phase.
