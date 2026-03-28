# AGSYS-234 Test Report

Date: 2026-03-28
Branch: codex/AGSYS-234-git-hardgate-npm

## Commands

1. `npm run git:audit`
- Result: PASS (report-only), warnings surfaced for dirty current worktree.

2. `npm run git:audit:strict`
- Result: expected FAIL with non-zero status when drift exists.

3. `npm run git:cleanup`
- Result: PASS (dry-run candidate listing).

## Acceptance Mapping

- npm entrypoints added: ✅
- root-level invocation works: ✅
- strict mode behavior preserved: ✅
- docs updated: ✅
