# PM Ticket Quality Checklist

Use before moving a ticket to `In Progress`.

## Mandatory
- [ ] Ticket has clear context/problem statement.
- [ ] Scope and out-of-scope are defined.
- [ ] Requirements pack exists (`docs/process/tickets/<ticket>-requirements-pack.md`).
- [ ] Requirements pack is owner-approved (`Status=APPROVED` with approver + timestamp).
- [ ] Assumptions review exists (`docs/process/tickets/<ticket>-assumptions-review.md`).
- [ ] Assumptions review is owner-approved (`Status=APPROVED` with approver + timestamp).
- [ ] Planning-only stage completed (no mutations done before approval).
- [ ] Explicit user go/no-go decision recorded.
- [ ] Git preflight completed (branch/scope/commit/rollback plan).
- [ ] Preflight token exists and is approved (`docs/process/git/preflights/<ticket>.env`).
- [ ] Worktree assignment is created/confirmed for mutating work.
- [ ] Git/worktree drift audit is green for current execution wave (`scripts/git/worktree_audit.sh`).
- [ ] For continuation flows, progress router report is attached (`scripts/pm/progress_router.sh`).
- [ ] Phased plan is present.
- [ ] Dependencies are listed.
- [ ] Acceptance criteria are measurable.
- [ ] Evidence requirements are listed.
- [ ] Assignee is set.
- [ ] Priority is set.
- [ ] For UI-impacting tickets: design intake questionnaire exists (`docs/process/tickets/<ticket>-design-intake.md`).
- [ ] For UI-impacting tickets: design intake questionnaire is owner-approved before planning/implementation.
- [ ] For UI-impacting tickets: UI-SPEC exists (`docs/process/tickets/<ticket>-ui-spec.md`).
- [ ] For UI-impacting tickets: UI-SPEC gate status is `APPROVED` before implementation.

## Role-Specific Preventive Checks
- [ ] Historical failure patterns reviewed from `team-issue-register.md`.
- [ ] Preventive notes injected into ticket for assigned role.
- [ ] Required consults completed (architect/trader/qa/reviewer/devops as needed).

## Gate Decision
- PASS -> move to `In Progress`
- FAIL -> return to `Backlog` with rewrite notes

## Sprint Closure Checklist (Mandatory)
Use before marking a sprint as closed/completed.

- [ ] Sprint integration branch/worktree was created (`codex/<sprint-id>-integration`).
- [ ] All sprint ticket branches are merged into integration branch.
- [ ] Integration + regression tests are green on integration branch.
- [ ] UI regression smoke (Playwright MCP) attached when UI scope exists.
- [ ] Verification gate is PASS for each sprint ticket (`scripts/pm/verification_gate.sh <ticket>`).
- [ ] Integration branch is merged to remote `main`.
- [ ] Verification debt audit is PASS (`scripts/pm/verification_debt_audit.sh --write`).
- [ ] Local `main` is synced and equals `origin/main` SHA.
- [ ] `scripts/git/worktree_cleanup_sweep.sh` executed after merge.
- [ ] `scripts/git/worktree_audit.sh` result is PASS after cleanup.
