# AGSYS-12 Verification Debt Audit Smoke

Date: 2026-03-21
Branch: `codex/AGSYS-12-verification-debt-audit`

## Scope
- Validate cross-phase verification debt aggregation.
- Validate hard-fail behavior when critical debt exists.

## Commands
1. `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"`
2. `bash scripts/pm/verification_debt_audit.sh --write`
3. `npm run -s pm:audit:verification-debt`

## Result
- PASS: package manifest remains valid.
- PASS: audit report generated:
  - `docs/process/pm/audits/2026-03-21-verification-debt.md`
- PASS: script exits non-zero (`20`) when critical debt exists, correctly blocking sprint closure.

## Runtime Snapshot
- `critical_debt=16`
- `actionable_now=16`
- `prerequisite_blocked=10`
- `clean=0`
