# TRADE-167 Technical Implementation Checklist (Post UI Pass)

Date: 2026-03-22
Branch: codex/TRADE-167-main-merge

## Runtime screen: control-by-control status

1. Left rail: projects and threads
- Status: Partial (UI + local state only)
- Implemented: project/thread selection in local React state.
- Missing backend: load real projects/threads/chains from API, persist, create/update/delete actions.

2. Left rail: top actions (`Новий ланцюжок`, `Автоматизації`, `Навички`)
- Status: Stub (UI only)
- Implemented: buttons rendered in codex-like layout.
- Missing backend: click handlers + routes + data flow.

3. Runtime mode selector
- Status: Functional (local persistence)
- Implemented: mode state with localStorage sync (`cockpit.runtime.mode.v1`).
- Missing backend: policy-level enforcement per mode (currently mostly frontend/session level).

4. Voice selector (`Auto/UA/EN`)
- Status: Partial functional
- Implemented: changes recognition language and whisper default payload language.
- Missing backend: true auto detection and robust per-provider voice pipeline.

5. Provider selector
- Status: Functional (API-backed)
- Implemented: fetch providers (`GET /api/cockpit/providers`) and set runtime (`POST /api/cockpit/providers/select`).
- Missing backend: stronger validation and permission model for runtime switch.

6. Model selector
- Status: Functional (API-backed with preset list)
- Implemented: runtime model switch (`POST /api/cockpit/providers/select`).
- Missing backend: dynamic model discovery by provider/capability; default strategy.

7. Plus button (catalog picker)
- Status: Partial
- Implemented: opens catalog popover, injects tokens (`@agent`, `/pipeline`, `#skill`) into composer chips.
- Missing backend: app/attachment picker semantics (Codex-like add-on/app actions), file attachment flow.

8. Composer tips / hotkeys
- Status: Functional (frontend)
- Implemented:
  - `Ctrl/Cmd + K` toggles catalog
  - `Backspace` removes last token when input empty
  - `Enter` sends (without Shift)
  - right-click token rehydrates into input
- Missing backend: configurable shortcuts and user-level keymap settings.

9. Scope checklist card (`Execution Scope`)
- Status: Partial (API + frontend)
- Implemented: reads from `GET /api/cockpit/work-scope`, allows local selection.
- Missing backend: durable selection persistence and strict server-side gating by selected scope.

10. Bottom operational strip (local/full access/git/worktree summary)
- Status: Partial
- Implemented: bottom runtime strip rendered with `Локально`, `Повний доступ`, active branch, runtime mode, refresh action.
- Missing backend: bind controls to real access policy, environment selector, and git/worktree runtime state source of truth.

11. Runtime output artifacts and links
- Status: Partial
- Implemented: ticket/branch/worktree shown when available; Plane link rendering.
- Missing backend: consistent artifact contract and guaranteed attachment flow for all stages.

## Settings: section-by-section status

12. General
- Status: Partial
- Implemented: UI controls + localStorage save.
- Missing backend: centralized settings persistence and server-driven defaults.

13. Appearance
- Status: Stub/Partial
- Implemented: UI and localStorage only.
- Missing backend: real theme token application pipeline and global propagation.

14. Configuration (providers)
- Status: Partial functional
- Implemented: save/test provider endpoints (`POST /api/cockpit/providers`, `POST /api/cockpit/providers/test`).
- Missing backend: secure secret vault flow, masking lifecycle, RBAC, audit trail.

15. Personalization / Usage
- Status: Stub/Partial
- Implemented: localStorage only.
- Missing backend: profile persistence and server policy sync.

16. MCP Servers
- Status: Partial
- Implemented: health check shell (`/api/health`, `/api/cockpit/catalog`) + local inventory UI.
- Missing backend: real MCP registry, lock/queue orchestration, transport-level tests, exclusive-mode scheduler.

17. Git / Environment / Worktrees / Archived Threads
- Status: Mostly local stubs
- Implemented: UI + local storage controls.
- Missing backend: real integration with git/worktree manager and archive service.

## Priority implementation backlog (technical only)

P0
- Implement bottom operator strip (execution mode/access/branch/worktree status).
- Replace left-rail static data with API-driven chains + persistence.
- Implement real `+` action model (attachments/apps) beyond token catalog.

P1
- Convert settings from localStorage-only to API-backed config store.
- Implement MCP server registry + lock modes (`isolated`, `share-safe`, `exclusive`) in backend.
- Add strict server-side scope enforcement for selected tasks/stories/sprint.

P2
- User-configurable hotkeys and personalization profiles.
- Appearance token engine with runtime preview and persisted theme packs.
- Extended artifact streaming (screenshots, run logs, diff cards) as first-class timeline entries.
