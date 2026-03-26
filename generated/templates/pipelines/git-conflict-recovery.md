# Pipeline: Git Conflict / Wrong-Branch Recovery

## Mandatory Git Preflight Gate
- Any mutating step is forbidden until an approved preflight token exists at `docs/process/git/preflights/<ticket>.env`.
- Token MUST match current `BRANCH` and `WORKTREE`, with `STATUS=APPROVED`, `EXECUTION_APPROVED=YES`, and approval metadata (`APPROVED_BY`, `APPROVED_AT`).
- If preflight validation fails, pipeline execution is blocked and must hand off to `Пан Гілка (Git Flow Manager)` for recovery.

## Goal
Safely recover from wrong-branch work, mixed-scope changes, and uncommitted conflicts without losing work or polluting history.

## Trigger Conditions
- Changes were made in an unapproved or wrong branch/worktree.
- Current diff contains files unrelated to branch ticket scope.
- PM/Git audit detects scope drift or untracked mutable work.
- Active request scope differs from current branch/preflight ticket scope.
- Worktree collision is detected (same active worktree reused by different ticket/assignee).

## Owner
Primary owner: `Пан Гілка (Git Flow Manager)`.

## Mandatory Inputs
- Ticket IDs involved (source and target)
- Current branch/worktree and `git status`
- Git preflight log entries
- Scope decision from PM (what belongs to which ticket)

## Steps
1. Freeze mutations
- PM blocks further edits on the affected workspace.
- Git Flow Manager announces recovery window and single owner.

2. Snapshot evidence
- Capture `git status`, `git branch --show-current`, and `git diff --name-only`.
- Save patch snapshot to `docs/process/git/<ticket>-recovery.patch`.
- Record untracked files list if present.

3. Scope classification
- PM + Git Flow Manager classify each changed file:
  - keep in source ticket,
  - move to target ticket,
  - discard (with justification).
- Produce mapping note in `docs/process/git/<ticket>-recovery-map.md`.

4. Create correct destination branch/worktree
- Git Flow Manager runs preflight for destination ticket.
- Create/assign correct `codex/<scope>` branch and worktree.
- Update `docs/process/git/worktree-registry.md`.

5. Move changes safely
- Preferred order:
  - stage only in-scope files and commit in source branch, then `cherry-pick` into destination if needed, or
  - apply split patch fragments into destination worktree.
- Keep commits atomic by concern (`runtime`, `process`, `git`, `ops`).

6. Validate destination
- Run required checks for the target pipeline.
- Confirm no unrelated files remain staged.
- Reviewer verifies commit scope integrity.

7. Integrate and close
- Merge destination branch by standard Git flow.
- Revert or drop accidental commits from wrong branch if they should not remain.
- Release stale worktree assignment and rerun `scripts/git/worktree_audit.sh`.

8. Post-incident prevention
- Create retrospective entry and prevention actions.
- Update guardrails/skills if failure class is recurring.

## Scope-Drift Replan Mode
- Stage id: `scope-drift-replan`
- Mandatory actions:
  1. Freeze current branch mutations.
  2. Capture current ticket/branch/worktree/preflight token in recovery report.
  3. Create or select correct target ticket.
  4. Issue new preflight token for target ticket.
  5. Switch to target `codex/<ticket>-*` branch/worktree before any further mutation.

## Required Artifacts
- Recovery report: `docs/process/git/<ticket>-recovery-report.md`
- Recovery map: `docs/process/git/<ticket>-recovery-map.md`
- Patch snapshot: `docs/process/git/<ticket>-recovery.patch`
- Updated preflight log entry in `docs/process/pm/git-preflight-log.md`
- Audit result after recovery

## Exit Criteria
- All relevant changes are committed only in correct branch/worktree.
- Wrong branch has no unintended scope residue.
- Merge completed through approved Git flow.
- Recovery artifacts and audit evidence are attached.

## Mandatory Postflight Validation Gate
- Pipeline cannot terminate with `Done`/`Closed` until postflight validation evidence is attached.
- Required evidence channels:
  - CLI/API smoke (if API path exists)
  - UI smoke via Playwright MCP or equivalent visual MCP (if UI exists)
- Evidence must be referenced in [object Object] comments and run artifact `docs/process/runs/<ticket>.md`.
- Missing postflight evidence is a hard gate failure and requires rollback to QA stage.
