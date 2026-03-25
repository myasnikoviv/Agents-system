# AGSYS-13 Plane Cycle Fix Smoke

Date: 2026-03-21
Branch: `codex/AGSYS-13-plane-cycle-fix`

## Scope
- Validate AGSYS cycle feature flag and API creation path.
- Validate worktree-safe `.env` fallback behavior for plane cycle script.

## Commands
1. `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"`
2. `bash scripts/plane/project_cycle_view_guard.sh 324fef07-4ae4-4c01-b077-44a37821195e`
3. `bash scripts/plane/create_cycle_api.sh 324fef07-4ae4-4c01-b077-44a37821195e "AGSYS Safe Cycle 2026-03-21" 2026-03-21 2026-04-03 "Cycle created via create_cycle_api.sh"`

## Result
- PASS: `package.json` valid.
- PASS: AGSYS project reports `cycle_view=True`.
- PASS: AGSYS cycle creation returns `status=201`.
