# TRADE-120 Cockpit Baseline UI/UX Findings

Date: 2026-03-20
Owner: Маестро Дизайну (Design Lead)
Pipeline: design-audit

## Method
- Heuristic UX review of current cockpit experience against operator workflow.
- Baseline evidence from current implementation behavior and known operator pain points.
- Playwright MCP capture completed on `http://127.0.0.1:5174/cockpit` (desktop baseline).

## Critical Findings (P0)
1. Mixed responsibilities in one surface
- Runtime control, catalog, health diagnostics, and provider settings are mixed in one area.
- Outcome: high cognitive load, low predictability, weak operator flow.

2. Prompt composition model is not operator-grade
- Prompt composer injects raw text fragments instead of structured interactive tokens/chips.
- Meta-language interactions are not robustly discoverable or editable.
- Outcome: low trust and high input friction for power users.

3. Settings and secrets UX is unsafe/confusing
- Provider/model/key controls are not clearly separated from execution context.
- Sensitive fields and technical status messaging are insufficiently normalized for operators.
- Outcome: configuration errors and low clarity in model/provider state.

## Major Findings (P1)
1. Project catalog interaction debt
- Agents/Pipelines/Skills list lacks actionable interaction model (selection, drag/drop, contextual insertion).

2. Event feed readability debt
- System/agent messages are noisy and under-structured for rapid decision making.
- Artifact semantics (ticket links, branch/worktree context) are not consistently prioritized.

3. Route architecture debt
- Missing explicit route boundaries for Runtime / Catalog / Composer / Settings / Health / Audit.

## Medium Findings (P2)
1. Visual hierarchy consistency
- Default controls and panel density reduce scanability.

2. Accessibility maturity gaps (to validate in visual run)
- Need explicit check for focus states, contrast, and keyboard navigation clarity in cockpit sections.

## Target Direction (for next design phase)
- Introduce route-level IA split:
  - `/cockpit/runtime`
  - `/cockpit/composer`
  - `/cockpit/catalog`
  - `/cockpit/settings`
  - `/cockpit/health`
  - `/cockpit/audit`
- Introduce chip-based command composition with slash/mention style interaction contract.
- Move provider/health controls into settings domain with secure key handling and explicit test actions.
- Standardize event feed semantics with artifact-first cards and actionable links.

## Playwright Evidence (Desktop Baseline)
- Status: OK
- Captured state confirms current UI structure and pain points:
  1. Header contains mode toggles (`Mock`, `Quasi-Linear`, `Multiple Agents`) mixed with `Scope` and `Voice` controls.
  2. `Live Hive State` right panel includes `Work Scope`, `Project Catalog`, `Prompt Composer`, `Health Center`, and `Provider Settings` in a single vertical flow.
  3. `Project Catalog` is text-list driven (agents/pipelines/skills), without chip primitives or drag/drop affordances.
  4. `Prompt Composer` uses dropdown insertion model, not token/chip composition.
  5. `Provider Settings` exposes raw provider status string (`openai:on:gpt-4o:key | ...`) that is operator-hostile.
  6. Runtime eventing shows SSE error in console and low-information feed state (`No events yet...`), reinforcing observability UX gaps.
- Next follow-up:
  1. Run mobile viewport baseline capture.
  2. Convert findings into IA + component redesign spec for TRADE-121..125 implementation tickets.
