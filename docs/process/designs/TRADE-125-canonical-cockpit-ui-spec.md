# TRADE-125 Canonical Cockpit UI Spec

Date: 2026-03-20
Owner: TB Design Lead
Pipeline: design-audit
Status: Draft for implementation handoff

## 1. Product Intent
Agent Cockpit is an operator console for autonomous pipeline execution. The interface must optimize three operator goals:
1. Create and launch high-quality execution prompts quickly.
2. Observe pipeline progress with artifact-level traceability.
3. Manage runtime/provider/system settings without mixing with live operations.

## 2. Information Architecture
Primary route: `/cockpit/:section`

Sections:
1. `runtime`
- Live execution timeline.
- Work scope summary and selected planning entities.
- Artifact strip (ticket, branch, worktree, preflight token).

2. `composer`
- Structured command composition.
- Token-first workflow with text default.
- Quick-command parser (`/pipeline`, `/agent`, `/skill`, `@agent`, `#skill`).

3. `catalog`
- Searchable/selectable list of agents/pipelines/skills.
- Click-to-insert and drag-to-insert token actions.

4. `settings`
- Health Center diagnostics.
- Provider configuration and runtime selection.
- Secure key entry and connection tests.

5. `audit`
- Links and summaries for UX audit artifacts and post-flight checks.

## 3. Interaction Contract
### 3.1 Prompt Composition
- Token kinds: `pipeline`, `agent`, `skill`.
- Each kind is single-select in current V1 token model (last write wins).
- Tokens are removable from chip strip.
- Drag-and-drop from Catalog to task input inserts structured token.

### 3.2 Command Parsing
Supported parser forms:
- `/pipeline <id>`
- `/agent <id>`
- `/skill <id>`
- `@<agent-id>`
- `#<skill-id>`

Parser output is normalized into token state before send.

### 3.3 Runtime Feed
Execution feed card schema:
- role
- stage
- status badge (`ok|progress|fail|neutral`)
- default marker (if exists)
- message/raw payload

Event stream card schema:
- agent role
- timestamp
- event type
- source/target stage
- Plane issue link (if available)

## 4. Accessibility & UX Baseline
Mandatory:
1. Semantic labels for input/select controls.
2. Accessible name for icon-only buttons.
3. Focus-visible styles for keyboard users.
4. Motion reduction support via `prefers-reduced-motion`.
5. No `transition: all` on interactive controls.

## 5. Visual Language
- Mission-control dark surface style.
- Clear hierarchy: header > left command surface > right telemetry.
- Badge-based status semantics and compact operator cards.
- Small text allowed only for metadata; primary content remains >=0.8rem.

## 6. Acceptance Criteria
1. Route-based panel switching works and URL stays synchronized.
2. Catalog chips support click + drag insertion into composer flow.
3. Provider settings are in semantic form with safe password input.
4. Runtime feed shows structured status and artifact links.
5. Accessibility gates pass local QA checklist.

## 7. Out of Scope (for TRADE-125)
- Rich visual node editor.
- Full slash autocomplete with keyboard navigation menu.
- Multi-token of same kind and ordering logic.
- Figma-driven theming system.

## 8. Handoff Dependencies
- TRADE-121: IA split and route ownership zones.
- TRADE-122: Composer token model.
- TRADE-123: Settings/provider UX.
- TRADE-124: Runtime execution feed clarity.
- TRADE-126: Visual baseline and regression checks.
