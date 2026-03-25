# TRADE-120 Cockpit Deep UI/UX Audit (Production-Grade)

Date: 2026-03-20
Owner: Маестро Дизайну (Design Lead)
Pipeline: design-audit
Methods: design-audit skill + ui-ux-pro-max + web-design-guidelines checks + Playwright desktop/mobile evidence + source-code audit

## Executive Verdict
Current cockpit UI is functional but not production-grade in UX architecture. Main blockers are IA responsibility mixing, weak operator mental model, non-composable command UX, and low-trust execution observability. The design quality is currently **3/10** for enterprise operator workflows.

## Evidence Sources
1. Playwright desktop snapshot: `http://127.0.0.1:5174/cockpit` (2026-03-20).
2. Playwright mobile viewport (390x844) snapshot (2026-03-20).
3. Interaction evidence: prompt composer select actions append raw text tokens into textarea.
4. Console evidence:
- SSE reconnect/error noise.
- Browser warning: password field not inside form.
5. Code references:
- `frontend/src/components/cockpit/CockpitPage.tsx`
- `frontend/src/components/cockpit/CockpitPage.css`

## Critical Findings (P0)

### P0-1 Information Architecture mixes control-plane and settings responsibilities
- Runtime surface currently combines orchestration telemetry, catalog, prompt composition, health diagnostics, and provider configuration in one vertical right rail.
- This causes continuous context switching and operator overload.
- References:
  - `/Users/myasnikoviv/development/trade_bot-worktrees/TRADE-120/frontend/src/components/cockpit/CockpitPage.tsx:711`
  - `/Users/myasnikoviv/development/trade_bot-worktrees/TRADE-120/frontend/src/components/cockpit/CockpitPage.tsx:823`
  - `/Users/myasnikoviv/development/trade_bot-worktrees/TRADE-120/frontend/src/components/cockpit/CockpitPage.tsx:835`

### P0-2 Prompt composition is not command-native
- Composer writes plain text (`pipeline:...`, `agent:...`, `skill:...`) into textarea, instead of interactive chips/tokens with state.
- No affordances for drag/drop from catalog, no slash/mention completion, no token-level delete/edit.
- Interaction evidence confirms insertion behavior.
- References:
  - `/Users/myasnikoviv/development/trade_bot-worktrees/TRADE-120/frontend/src/components/cockpit/CockpitPage.tsx:433`
  - `/Users/myasnikoviv/development/trade_bot-worktrees/TRADE-120/frontend/src/components/cockpit/CockpitPage.tsx:798`

### P0-3 Execution observability is low-signal for operators
- Feed entries are raw-ish status lines lacking normalized artifact cards (ticket, branch, worktree, owner, action result).
- Primary conversational stream uses generic “System” label for agent responses, reducing trust and traceability.
- References:
  - `/Users/myasnikoviv/development/trade_bot-worktrees/TRADE-120/frontend/src/components/cockpit/CockpitPage.tsx:624`
  - `/Users/myasnikoviv/development/trade_bot-worktrees/TRADE-120/frontend/src/components/cockpit/CockpitPage.tsx:763`
  - `/Users/myasnikoviv/development/trade_bot-worktrees/TRADE-120/frontend/src/components/cockpit/CockpitPage.tsx:881`

### P0-4 Accessibility and semantic form issues in operator-critical controls
- Icon send button lacks explicit accessible name.
- Multiple form controls are visually labeled with `<span>` but not semantically bound `<label>`.
- Provider password input is outside a semantic `<form>` (browser warning).
- References:
  - `/Users/myasnikoviv/development/trade_bot-worktrees/TRADE-120/frontend/src/components/cockpit/CockpitPage.tsx:679`
  - `/Users/myasnikoviv/development/trade_bot-worktrees/TRADE-120/frontend/src/components/cockpit/CockpitPage.tsx:556`
  - `/Users/myasnikoviv/development/trade_bot-worktrees/TRADE-120/frontend/src/components/cockpit/CockpitPage.tsx:800`
  - `/Users/myasnikoviv/development/trade_bot-worktrees/TRADE-120/frontend/src/components/cockpit/CockpitPage.tsx:856`

## Major Findings (P1)

### P1-1 No route-level separation for primary cockpit jobs
- Single page tries to be runtime console + config center + catalog browser.
- Required route split:
  - `/cockpit/runtime`
  - `/cockpit/composer`
  - `/cockpit/catalog`
  - `/cockpit/settings/providers`
  - `/cockpit/settings/health`
  - `/cockpit/audit`

### P1-2 Visual hierarchy and density are inconsistent with operator scanning
- Overuse of low-contrast text at small sizes (0.76–0.85rem) in dense cards.
- Too many same-weight “catalog-card” blocks, weak section prioritization.
- References:
  - `/Users/myasnikoviv/development/trade_bot-worktrees/TRADE-120/frontend/src/components/cockpit/CockpitPage.css:325`
  - `/Users/myasnikoviv/development/trade_bot-worktrees/TRADE-120/frontend/src/components/cockpit/CockpitPage.css:396`
  - `/Users/myasnikoviv/development/trade_bot-worktrees/TRADE-120/frontend/src/components/cockpit/CockpitPage.css:469`

### P1-3 Motion/performance patterns include anti-patterns
- `transition: all` appears on interactive controls; should scope to explicit properties.
- Multiple animated surfaces without reduced-motion handling.
- References:
  - `/Users/myasnikoviv/development/trade_bot-worktrees/TRADE-120/frontend/src/components/cockpit/CockpitPage.css:50`
  - `/Users/myasnikoviv/development/trade_bot-worktrees/TRADE-120/frontend/src/components/cockpit/CockpitPage.css:247`
  - `/Users/myasnikoviv/development/trade_bot-worktrees/TRADE-120/frontend/src/components/cockpit/CockpitPage.css:621`

### P1-4 Provider management UX is too technical and under-protected
- Raw status line (`openai:on:gpt-4o:key ...`) is not human-readable operational UX.
- Model input is free-text with no validated model catalog.
- Settings controls should live in dedicated settings flow with secure reveal/rotate/test patterns.
- References:
  - `/Users/myasnikoviv/development/trade_bot-worktrees/TRADE-120/frontend/src/components/cockpit/CockpitPage.tsx:845`
  - `/Users/myasnikoviv/development/trade_bot-worktrees/TRADE-120/frontend/src/components/cockpit/CockpitPage.tsx:870`

## Medium Findings (P2)

### P2-1 Header overcrowding and weak task framing
- Mode, scope, and voice all compete in top nav without clear priority.
- Model/provider selection belongs near prompt context or settings depending on workflow mode.

### P2-2 Brand and typography direction is generic
- Default style tends toward generic dark-gradient dashboard.
- Need stronger visual language tuned for enterprise “mission control” use case.

### P2-3 Copy system inconsistent
- Status messages mix technical and conversational voices.
- Needs one canonical copy system for role events, fallback, artifacts, handoff.

## Compliance Delta (against web-interface-guidelines)
1. Missing/weak semantic labels on controls.
2. Icon actions need stable accessible naming.
3. `transition: all` should be removed.
4. Forms need semantic grouping and predictable submit/validation behavior.
5. Feed needs stronger structured content handling (long/empty/error states).

## Target UX Architecture (Approved Direction Proposal)

### A. Structural split
1. Runtime Console: conversation + live execution timeline + artifact cards.
2. Command Composer: chip-based meta-language builder with slash/mention parser.
3. Project Catalog: searchable filterable entities with drag/insert actions.
4. Settings: provider registry, model catalog, key vault interactions, health center.
5. Audit: diagnostics and post-flight validation outputs.

### B. Command UX contract
1. Chips for `pipeline`, `agent`, `skill`, `scope`, `ticket`, `mode`.
2. Text fallback still available, but parser normalizes into chips.
3. Drag from catalog onto composer to instantiate structured chip.
4. Keyboard-first editing and token deletion.

### C. Feed UX contract
1. Event card schema: `role`, `stage`, `status`, `artifact`, `timestamp`, `action`, `result`.
2. Artifact-first rendering: clickable Plane issue, branch, worktree, run id.
3. Severity-coded statuses and grouped stage clusters.

### D. Accessibility baseline gates
1. All icon-only controls require `aria-label`.
2. Inputs/selects require real `<label>` + `id`.
3. Focus-visible styles mandatory.
4. Reduced motion mode required.

## Implementation Phasing

### Phase 1 (Blockers, P0)
- IA split and hard separation between Runtime and Settings concerns.
- Command composer V2 (chip model).
- Feed V2 with artifact cards and role-attributed outputs.
- Accessibility guard fixes for controls/forms.

### Phase 2 (Production UX, P1)
- Typography, spacing, contrast normalization.
- Motion token cleanup (`transition` scoping, reduced motion).
- Provider settings UX redesign with model catalogs and safe key workflows.

### Phase 3 (Polish, P2)
- Brand-grade visual direction refinement.
- Copy system and tone unification.
- Optional advanced interactions (smart filtering, saved command presets).

## Ticket Mapping (for PM)
- TRADE-121: IA/routes redesign spec.
- TRADE-122: Composer chips + meta-language UX redesign.
- TRADE-123: Settings/provider UX redesign.
- TRADE-124: Runtime feed/artifacts redesign.
- TRADE-125: Canonical docs/spec package for handoff.
- TRADE-126: Playwright visual baseline + regression protocol.

## Assignment Recommendation
- PM Orchestrator: decomposition, sequencing, acceptance gates.
- Solution Architect: route and component architecture.
- Developer: implementation.
- TDD QA: CLI + Playwright pass/fail gates.
- Documentation Owner: UX contract and operator runbook updates.
- Design Lead role: visual acceptance authority on all tickets.

Note: Workspace members currently do not include a separate Plane user named `TB / Design Lead`; assign to PM Orchestrator temporarily and reassign once dedicated design member exists.
