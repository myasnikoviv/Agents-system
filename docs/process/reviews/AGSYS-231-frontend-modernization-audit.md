# AGSYS-231 Frontend Modernization Audit (2026-03-26)

## Executive Summary
Frontend already has Tailwind v4 installed, but the UI runtime is still mostly legacy-CSS driven. This creates style drift, fragile modal/layout behavior, and duplicated API transport logic in screens.

## Current State
- Framework: React 19 + Vite 8 + TypeScript
- Routing: React Router 7
- Styling:
  - Tailwind configured and available
  - Large screen-level CSS still dominant:
    - `CockpitPage.css` ~1672 LOC
    - `CockpitSettingsPage.css` ~354 LOC
  - Legacy globals in `index.css` conflict with current dark cockpit design tokens
- API layer:
  - Before this pass: duplicated fetch/JSON parsing logic in multiple components
  - After phase-1: centralized shared client in `src/lib/http.ts`

## Stability Findings
1. Proxy/runtime failures were amplified by per-screen request helpers and inconsistent JSON parsing behavior.
2. Styling stack is hybrid but unmanaged: Tailwind + global CSS + screen CSS + token CSS, without a single ownership model.
3. Large monolithic screen files (`CockpitPage.tsx`, `CockpitSettingsPage.tsx`) increase regression risk for any visual change.

## Modernization Target Stack
- Tailwind v4 as primary styling runtime
- Token-first theme via CSS variables bound to Tailwind utilities
- Shared UI primitives (`Button`, `Input`, `Modal`, `Select`, `Badge`) replacing ad-hoc class strings
- Unified HTTP client (`src/lib/http.ts`) + typed response contracts
- Incremental extraction of cockpit surface into composable subcomponents

## Migration Plan
### Phase 1 (done in this pass)
- Introduce centralized HTTP layer and remove duplicated transport/parser logic from cockpit screens.

### Phase 2
- Extract cockpit UI primitives and move modal/controls/actions to shared component layer.
- Stop introducing new ad-hoc CSS classes in screen files.

### Phase 3
- Convert `CockpitPage` visual sections to Tailwind primitives section-by-section; delete corresponding legacy CSS blocks.

### Phase 4
- Convert `CockpitSettingsPage` to same primitive system.
- Normalize typography, spacing scale, and interaction states.

### Phase 5
- Remove obsolete global styles from `index.css`; keep only app shell resets + Tailwind imports.
- Add visual regression snapshots for cockpit runtime/settings.

## Success Criteria
- No new features shipped in legacy screen CSS.
- Runtime + settings screens rely on shared primitives and Tailwind utilities.
- API errors are consistently surfaced and handled across screens.
- Legacy CSS files reduced by >80% and then retired.
