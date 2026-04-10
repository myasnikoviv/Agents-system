# White-Label Project Onboarding Runbook

## Purpose
Onboard Agent Cockpit runtime for a new project folder with predictable validation, operator checks, and rollback path.

## Target Outcome
1. Project-level agent/pipeline/skill docs are discoverable.
2. Runtime can select pipeline from project context.
3. Cockpit can run send -> approval -> continue loop.
4. Operator has clear default and rollback actions.

## Preconditions
1. Work in dedicated ticket worktree + branch (never mutate `main`).
2. Preflight token exists and is approved for current branch/worktree.
3. Environment is available (`.env` or exported vars):
- `OPENAI_API_KEY`
- `PLANE_API_KEY`
- `PLANE_WORKSPACE_SLUG`
- `PLANE_API_HOST_URL`
4. Shared DB path is configured or default is reachable (`~/development/.trade_bot_data/db/strategies.db`).

## Onboarding Steps
1. Prepare project governance docs:
- `docs/agents/*.md`
- `docs/skills/*.md`
- `docs/pipelines/*.md`
2. Generate/refresh canonical runtime manifest bundle (if migration adapter is available):
```bash
npm run runtime:manifest:migrate
```
Expected output:
- `docs/runtime/project-runtime-manifest.v1.json`
3. Install dependencies:
```bash
npm install --include=dev
cd frontend && npm install
```
4. Start backend and cockpit UI:
```bash
npm run server
cd frontend && npm run dev:cockpit
```
5. Health/diagnostics:
- `GET /api/health` -> `status=ok`
- `GET /api/diagnostics/openai` -> category is actionable
6. Operator smoke in Cockpit:
- Open `http://localhost:5174/`
- Submit task in `multiple_agents` or `linear`
- Verify `awaiting_approval` appears when gate is expected
- Approve and confirm stage progression

## Verification Checklist
- [ ] Project docs detected (agents/skills/pipelines non-empty).
- [ ] Pipeline selection resolved (default only when expected).
- [ ] Event feed shows role/stage transitions.
- [ ] Approval gate works end-to-end.
- [ ] Runtime artifacts recorded (`docs/process/pm/pipeline-state`, `docs/process/runs/ledger`).

## Troubleshooting Matrix
### Symptom: `governance_blocked:main_branch_mutation_forbidden`
Cause: runtime started in `main` branch context.
Action:
1. Stop run.
2. Switch to ticket branch/worktree.
3. Confirm preflight token matches branch+worktree.

### Symptom: `Manifest unavailable, default to legacy selector`
Cause: canonical bundle missing/unreadable.
Action:
1. Ensure `docs/runtime/project-runtime-manifest.v1.json` exists.
2. Regenerate bundle (if tool available): `npm run runtime:manifest:migrate`.
3. Validate project docs source (`docs/agents|skills|pipelines`).

### Symptom: Cockpit send/approve returns 500
Cause: upstream provider/quota or runtime env breakage.
Action:
1. Check `GET /api/diagnostics/openai`.
2. Confirm `OPENAI_API_KEY` and billing/quota.
3. Retry in `mock` mode to isolate provider issue.

### Symptom: Plane MCP 401
Cause: invalid token/session env drift.
Action:
1. Recheck Plane env keys.
2. Validate token in Plane UI.
3. Restart Codex session to reload MCP env.

### Symptom: DB init/migration errors in worktree
Cause: DB path drift or incompatible local state.
Action:
1. Confirm `STRATEGY_DB_PATH` / shared path.
2. Re-run backend from clean process.
3. If needed, move aside broken local DB and re-init from shared baseline.

## Rollback Procedure
Use when onboarding introduces unstable behavior.
1. Stop API/UI processes.
2. Revert onboarding branch to last known-good commit (inside ticket branch only).
3. Remove or restore runtime bundle:
- delete `docs/runtime/project-runtime-manifest.v1.json` if it is invalid,
- or restore previous committed version.
4. Restart backend and confirm:
- `/api/health` PASS
- `/api/chat` in `mock` mode PASS
5. Record rollback action in Plane ticket with root-cause note and evidence.

## Evidence Artifacts
Store for each onboarding attempt:
- `docs/process/pm/pipeline-state/<ticket>.md`
- `docs/process/tests/<ticket>-onboarding-checklist.md`
- `docs/process/runs/<ticket>-onboarding-run.md` or ledger files
