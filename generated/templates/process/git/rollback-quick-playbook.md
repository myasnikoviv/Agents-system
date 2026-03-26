# GIT-603 Rollback Quick Playbook

## Safe Rollback Steps
1. Identify target commit/tag to rollback to.
2. Preserve current state: `git status`, optional stash/backup patch.
3. Use non-destructive rollback path first (revert commits).
4. Validate build/tests and runtime smoke.
5. Push rollback branch and merge through GitFlow manager.

## Emergency Path
- Only with PM approval and explicit incident note.
- Must include recovery plan and post-rollback verification artifact.

## Verification
- Strategy boot ok.
- Contract drift check ok.
- Plane-critical scripts still operational.
