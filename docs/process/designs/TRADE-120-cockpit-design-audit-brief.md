# TRADE-120 Cockpit Design Audit Brief

## Request Summary
Run full UI/UX audit of Agent Cockpit and redesign the interface architecture to improve usability, discoverability, and execution control.

## Input Context (from operator)
- Current cockpit UI is rated very low usability.
- Mixed responsibilities in one screen (runtime, control, settings, health, catalog).
- Prompt composer and catalog interactions are not ergonomic.
- Meta-language interactions are weak (no robust command UX/chips/mentions).
- Provider/settings area is confusing and exposes technical/raw details poorly.
- Event feed and artifact visibility are noisy and under-structured.

## Dependencies / Prior Context
- Sprint context: TRADE-106..118
- Existing cockpit implementation and panels in frontend cockpit route.

## Audit Scope
1. Information architecture and route separation.
2. Prompt composer + command language interaction model.
3. Project catalog interaction model (chips/drag/drop/selection workflow).
4. Settings/provider management UX and safety.
5. Runtime feed and artifact rendering UX.
6. Accessibility and responsive behavior baseline.

## Deliverables
- Baseline heuristics report with Playwright evidence.
- Target IA and route map.
- Interaction contracts for key controls.
- Prioritized redesign backlog (P0/P1/P2).
- Canonical UI documentation and option glossary.

## Acceptance Criteria
- Every major cockpit responsibility mapped to explicit route/section owner.
- Command composition flow defined and testable.
- Settings/provider flows are secure, comprehensible, and operator-friendly.
- Event/artifact feed has clear semantics and actionable links.
- Playwright-backed before-state evidence attached.
