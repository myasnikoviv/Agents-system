# AGSYS-212 Executor Backplane Smoke Report

## Scope
- Validate Cockpit external executor endpoint.
- Validate LangGraph -> AgentExecutor path with `COCKPIT_EXECUTOR_BACKEND=claude-code`.

## Unit Tests
- Command:
  - `npx jest src/runtime/__tests__/external_execution_adapter.test.ts --runInBand`
- Result:
  - PASS (2/2 tests)

## CLI/API Smoke

### 1) Direct endpoint smoke
- Command:
  - `POST /api/cockpit/executor/run` with prompt `Reply with exactly: EXECUTOR_OK`
- Result:
  - Endpoint reachable and executed adapter (Claude path).
  - Runtime response indicated local Claude CLI auth requirement:
    - stdout: `Your account does not have access to Claude Code. Please run /login.`
    - exitCode: `1`

### 1.1) Codex CLI endpoint smoke
- Command:
  - `POST /api/cockpit/executor/run` with `executor=codex-cli`, `model=gpt-5.3-codex`
- Result:
  - PASS: returned structured JSONL output.
  - Agent output contained `EXECUTOR_OK`.
  - Exit code `0`.
  - Note: stderr includes non-fatal local warnings (`unknown feature key`, shell snapshot warnings).

### 1.2) Auto model mode smoke
- Command:
  - `POST /api/cockpit/settings/executor` with:
    - `backend=codex-cli`
    - `codex.model=auto`
    - `claude.model=auto`
  - then `POST /api/cockpit/executor/run` without explicit model.
- Result:
  - PASS: execution succeeded (`EXECUTOR_AUTO_OK`, exit code `0`).
  - Confirmed that `auto` mode omits explicit `--model` CLI flag for executor run.

### 2) LangGraph path smoke
- Command:
  - `COCKPIT_EXECUTOR_BACKEND=claude-code PORT=3013 npx tsx src/server.ts`
  - `POST /api/chat` with structured intake payload.
- Result:
  - Request reached runtime governance gates.
  - Blocked by existing git policy on current branch:
    - `governance_blocked:main_branch_mutation_forbidden:main`

## Interpretation
- Integration wiring is active.
- External CLI backend is callable from Cockpit backend.
- Full successful execution now depends on:
  1. Claude CLI authenticated session (`/login`).
  2. Running from approved non-main ticket branch/worktree with valid preflight token.

## Visual QA
- UI visual smoke attempted for `/cockpit/settings/configuration`.
- Blocked by local Playwright browser-session launch issue (existing Chrome session lock).
- Functional verification of new settings was completed via API + code review; full screenshot pass pending once browser context lock is cleared.
