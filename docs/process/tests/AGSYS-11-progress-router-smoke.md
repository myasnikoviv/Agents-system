# AGSYS-11 Progress Router Smoke

Date: 2026-03-21
Branch: `codex/AGSYS-11-progress-router`

## Scope
- Validate deterministic PM progress router command.
- Validate legacy/compact state-card compatibility (`Stage`/`Next` aliases).

## Commands
1. `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package.json OK')"`
2. `bash scripts/pm/progress_router.sh TRADE-146`
3. `npm run -s pm:progress TRADE-146`

## Result
- PASS: `package.json` remains valid after adding `pm:progress` script.
- PASS: router command returns stable report with deterministic `next_action`.
- PASS: npm wrapper delegates correctly to router script.

## Sample Output
`next_action: handoff_to_next_owner`

