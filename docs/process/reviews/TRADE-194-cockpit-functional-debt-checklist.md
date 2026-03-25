# TRADE-194 Cockpit Functional Debt Checklist

Date: 2026-03-22
Branch: codex/TRADE-194-codex-runtime-footer
Ticket: TRADE-194

## Summary
This checklist tracks UI elements already present in the codex-style cockpit shell that still require deeper runtime wiring or production-grade behavior.

## Runtime Composer
- [x] `+` action button has menu shell (catalog toggle, file attach token).
- [ ] Real file upload pipeline (not token-only), with artifact persistence and ticket attachment linking.
- [ ] App picker parity (attach app/tool contexts like Codex app integrations).
- [ ] Token chips lifecycle parity (edit/rehydrate/validation parity for malformed meta tokens).

## Runtime Footer
- [x] Execution target persisted via backend runtime-footer API.
- [x] Access policy persisted via backend runtime-footer API.
- [x] Active branch shown from runtime footer API.
- [ ] Branch selector action wiring (currently display-only).
- [ ] Git/worktree dropdown parity (history, switch, validations).
- [ ] Runtime mode selector final placement policy (settings-first canonical source of truth).

## Left Rail (Projects/Threads)
- [x] Projects/threads loaded from API.
- [x] New thread creation from UI.
- [ ] Thread history persistence to DB (currently in-memory runtime model).
- [ ] Search/filter action wiring in rail mini controls.
- [ ] Thread pin/archive flows.

## Settings Route
- [ ] General settings controls: ensure every field writes to persistent backend config.
- [ ] Appearance section: theme/font/spacing controls with persistence.
- [ ] Configuration section: runtime defaults and safety policy persistence.
- [ ] Personalization section: user profile/preferences persistence.
- [ ] Usage section: telemetry/report cards backed by real metrics.
- [ ] MCP Servers section: CRUD + connectivity smoke checks per server.
- [ ] Git section: branch/worktree health + sync actions.
- [ ] Environment section: provider keys and env diagnostics with secure masking.
- [ ] Worktrees section: list/switch/cleanup actions.
- [ ] Archived threads section: restore/delete flows.

## Chat / Observability
- [ ] Rich artifact cards in chat timeline (ticket links, changed files, test reports).
- [ ] Event feed enrichment with actionable links and stage-specific badges.
- [ ] Scope tree lifecycle from PM response as pinned contextual object (create/update/complete).

## QA / Gates
- [ ] Playwright visual parity test suite for codex-style shell snapshots.
- [ ] CLI integration smoke for runtime-footer + chains endpoints in merged main branch.
- [ ] Regression matrix bound to sprint integration branch before sprint closure.

## Notes
- Current TRADE-194 slices completed in this branch: runtime footer API binding, chains API-backed rail, plus action menu.
- Next execution should continue from this checklist as implementation backlog items.
