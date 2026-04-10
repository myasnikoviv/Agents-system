# TRADE-102 E2E Smoke Matrix (CLI + Playwright)

## Scope
Validate project-agnostic runtime operator flow in Agent Cockpit:
- API availability and intake route
- Pipeline selection and staged handoff in `multiple_agents` mode
- Approval gate and continuation to Git/Docs stages
- UI event stream + observability panel correctness

## Environment
- Worktree: `/Users/myasnikoviv/development/trade_bot-worktrees/TRADE-102`
- Branch: `codex/TRADE-102-e2e-smoke-matrix`
- Backend: `npm run server` (port `3001`)
- Frontend: `npm run dev:cockpit` (port `5174`)

## CLI Smoke
1. `GET /api/health` -> PASS (`status=ok`)
2. `POST /api/chat` with `executionMode=mock` -> PASS (`status=done`)
3. `POST /api/chat` with `executionMode=multiple_agents` -> PASS

Observed response includes:
- `selectedPipeline: unified-task-intake`
- `status: awaiting_approval`
- `observability.stage: approval_gate`
- `observability.nextStage: git`

## UI Smoke (Playwright MCP)
Scenario on `http://localhost:5174/`:
1. Open Cockpit page -> PASS
2. Keep `Multiple Agents` mode selected -> PASS
3. Submit task via input -> PASS
4. Verify live event feed (research/trader/architect/qa/dev/runner/reviewer/domain) -> PASS
5. Verify approval gate rendered (`Approve & Continue`) -> PASS
6. Click approve -> PASS
7. Verify completion through `git.completed` + `docs.completed` and observability `stage=docs_completed` -> PASS

## Artifacts
- Pipeline states:
  - `docs/process/pm/pipeline-state/chat-1773943752172.md`
  - `docs/process/pm/pipeline-state/chat-1773943791927.md`
- Run ledgers:
  - `docs/process/runs/ledger/265dff5d-c78c-4b0a-97e7-f611634cdfac.jsonl`
  - `docs/process/runs/ledger/91a648b8-595b-4eac-b9a5-e94a105563a2.jsonl`

## Result
- Matrix status: PASS
- Blocking defects: none
- Note: Runtime used default responses (`default:insufficient_quota`) for content generation, while orchestration and handoff sequence remained correct.
