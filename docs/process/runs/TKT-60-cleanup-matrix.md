# TKT-60 Cleanup Matrix (Working Tree Triage)

## Current Uncommitted Changes
| File | Proposed Ticket | Action |
|---|---|---|
| `scripts/git/preflight_guard.sh` | TKT-59 | Keep in current fix scope |
| `src/runtime/graphs/PilotQuasiLinearGraph.ts` | TKT-59 | Keep in current fix scope |
| `src/runtime/__tests__/pilot_approve_quota_fallback.test.ts` | TKT-59 | Keep in current fix scope |
| `docs/process/*/TKT-59*` | TKT-59 | Keep in current fix scope |
| `frontend/src/App.tsx` | TKT-60/TKT-61 | Move to runtime-mode clarification slice |
| `frontend/src/components/cockpit/CockpitPage.tsx` | TKT-60/TKT-63 | Move to cockpit UX/E2E slice |
| `frontend/src/components/cockpit/CockpitPage.css` | TKT-60/TKT-63 | Move to cockpit UX/E2E slice |
| `src/server.ts` | TKT-62 | Move to diagnostics/API-hardening slice |
| `scripts/up.sh` | TKT-64 (or DevOps ticket) | Move to ops/runbook slice after review |

## Cleanup Policy
1. Finalize and commit only TKT-59 scoped files first.
2. Leave unrelated files unstaged or migrate via dedicated follow-up branches.
3. Open one execution branch per follow-up ticket group.
