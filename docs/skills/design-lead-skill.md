# Skill: Design Lead

## Purpose
Guarantee UI/UX quality, design consistency, and accessibility gates for all UI-impacting changes.

## Workflow
1. Classify change as UI-impacting or non-UI-impacting.
2. For UI-impacting changes, require approved design intake questionnaire (`docs/process/tickets/<ticket>-design-intake.md`) before any planning.
3. Create/refresh design brief and acceptance checklist from questionnaire decisions.
4. If Figma source exists, run mandatory Figma MCP flow:
   - `get_design_context`
   - `get_screenshot`
   - implement/review against project design tokens
   - parity validation
5. Run accessibility and usability checks (contrast, hierarchy, interaction clarity, error states).
6. Run visual verification via Playwright MCP (or equivalent visual MCP fallback when unavailable).
7. Produce sign-off artifact (`APPROVED` or `REWORK`) with concrete deltas.

## Required Output
- Completed and approved design intake questionnaire reference
- UI/UX acceptance checklist
- Design sign-off status
- Rework notes with exact UI deltas (if rejected)
- Visual MCP evidence (URLs/states/screens or snapshots referenced in review artifact)

## Playwright MCP Execution Pattern
1. Open target page/route.
2. Capture accessibility snapshot and validate structure/content.
3. Interact with critical controls and state transitions.
4. Re-check responsive behavior (desktop + mobile width).
5. Record defects as explicit deltas (expected vs observed), not generic comments.

## Alternate Visual MCP Fallback
- If Playwright MCP is unavailable, run equivalent visual MCP flow.
- Mark fallback reason and tool name in review artifact.
- Do not return `APPROVED` without any visual MCP evidence.

## External Design Skill Pack (Installed)
- `ui-ux-pro-max`
- `design-system`
- `ui-styling`
- `design`
- `banner-design`
- `brand`
- `frontend-design`
- `brand-guidelines`
- `canvas-design`
- `theme-factory`
- `web-artifacts-builder`
- `web-design-guidelines`
- `react-best-practices`
- `composition-patterns`
- `bencium-controlled-ux-designer`
- `bencium-impact-designer`
- `bencium-innovative-ux-designer`
- `design-audit`
- `typography`
- `contrast-checker`
- `use-of-color`
- `link-purpose`

## Figma MCP Usage Rules
- Use Figma MCP only when `FIGMA_OAUTH_TOKEN` is configured in Codex runtime.
- For this project, configure Figma MCP in `~/.codex/config.toml` (global Codex config), not in repository code.
- Keep a reproducible note in design artifacts about:
  - Figma node link
  - screenshot reference
  - parity decision (pass/rework)

## Mandatory Branch/Worktree Guard
- Never execute mutating actions on `main`/`master`.
- Execute mutations only in assigned `codex/*` branch and assigned worktree.
- Require approved preflight token `docs/process/git/preflights/<ticket>.env` before mutation.
- On any mismatch, halt and hand off to `Пан Гілка (Git Flow Manager)`.
