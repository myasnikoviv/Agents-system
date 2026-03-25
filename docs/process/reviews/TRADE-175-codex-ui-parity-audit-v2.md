# TRADE-175 Codex UI Parity Audit v2

Date: 2026-03-21
Branch: codex/TRADE-175-parity-audit-v2
Worktree: /Users/myasnikoviv/development/trade_bot-worktrees/TRADE-175
Reference: user-provided Codex screenshots (chat-first desktop shell + dedicated settings route)

## Summary
The shell moved in the right direction after TRADE-170/171/172, but parity with Codex-like interaction still remains partial.

Overall parity score (shell-level UX): **66 / 100**
Target threshold: **>= 85 / 100**
Status: **NOT PASS**

## Matrix
1. Information architecture and route separation: **8/10**
- Improved: settings are in dedicated route, runtime is no longer overloaded with provider secret management.
- Delta: runtime still contains scope mechanics that should become more conversation-native/pinned-thread centric.

2. Chat-first composition model: **7/10**
- Improved: contextual catalog popover near input, meta-language chips, inline token insertion.
- Delta: composer still lacks richer inline command affordances (stronger slash/mention interaction model, richer selected-token edit UX).

3. Left rail / project-thread ergonomics (Codex-style mental model): **3/10**
- Missing: persistent project/thread rail equivalent (session list, quick context switching).
- Impact: operator cannot navigate across active conversations as efficiently as in Codex-like shell.

4. Runtime observability readability: **8/10**
- Improved: artifact-first event cards, clearer role/stage/status metadata, branch/worktree visibility.
- Delta: event grouping/filtering and density tuning for long-running sessions still needed.

5. Visual polish / control quality: **7/10**
- Improved: default-control feel reduced (custom focus/hover/select styling).
- Delta: there are still remnants of utility-panels and mixed visual hierarchy in runtime lower section.

6. Settings parity vs Codex settings mental model: **7/10**
- Improved: dedicated settings sections exist and are navigable.
- Delta: deeper behavior parity and richer settings controls still needed in some sections.

7. Mobile behavior and responsive hierarchy: **6/10**
- Improved: primary runtime composition remains usable.
- Delta: compact rail-less mode is acceptable, but interaction density and vertical rhythm can be optimized further.

8. Responsibility separation (runtime vs settings vs audit): **7/10**
- Improved: major move away from monolithic runtime panel.
- Delta: pinned scope block should evolve into a stronger in-chat/pinned-message execution contract.

## Key Deltas to Close Next
- Add Codex-like session/project rail and conversation navigation model.
- Upgrade composer to richer mention/slash workflow (faster keyboard path, token editing shortcuts, stronger inline hints).
- Convert scope selection into true chat-native task tree card lifecycle (PM response -> pinned checklist -> execution updates).
- Tighten visual hierarchy and spacing rhythm in runtime lower zone for lower cognitive load.
- Add observability filters/grouping (by stage/role/status) with compact mode.

## Gate Decision
- This is a measurable improvement over previous iterations, but parity threshold for shell UX is not reached yet.
- Recommended action: create another focused implementation wave for deltas above before final signoff.
