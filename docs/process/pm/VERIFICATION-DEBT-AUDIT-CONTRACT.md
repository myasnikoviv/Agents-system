# Verification Debt Audit Contract

## Goal
Continuously detect unresolved verification debt across phases and block sprint closure on critical debt.

## Command
- `bash scripts/pm/verification_debt_audit.sh --write`

## Output
1. CLI summary with:
   - `critical_debt`
   - `actionable_now`
   - `prerequisite_blocked`
   - `clean`
2. Audit artifact:
   - `docs/process/pm/audits/<YYYY-MM-DD>-verification-debt.md`

## Classification Rules
- `Actionable Now`: verification status is missing/fail/invalid/gaps and phase is `verify` or `closure`.
- `Prerequisite Blocked`: verification debt exists but phase is still `plan` or `execute`.
- `Clean`: report is PASS and gaps are none.

## Sprint Closure Rule
- Sprint cannot be marked closed if `critical_debt > 0`.
- PM must open/reopen follow-up ticket(s) for each actionable entry before retrying closure.
