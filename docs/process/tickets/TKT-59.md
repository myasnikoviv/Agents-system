# TKT-59: Agent Cockpit Approve Fails on OpenAI 429 (Insufficient Quota)

## Business Context
`Approve & Continue` in Agent Cockpit fails with HTTP 500 when graph resumes at QA planning and upstream LLM call returns OpenAI 429 (`insufficient_quota`). This blocks the human-in-the-loop pipeline and prevents normal agent handoffs.

## Repro Scenario
1. Open Cockpit and run a task in `multiple_agents` or `linear` mode with `OPENAI_API_KEY` set.
2. Reach approval gate and click `Approve & Continue`.
3. Observe backend error and failed continuation.

Evidence:
- `[PilotGraph] Running QA planning...`
- `[Chat API] Approve Error: Error [InsufficientQuotaError]: 429 ...`

## Expected Handoff Pipeline
1. `Сокіл-Координатор (PM Orchestrator)` -> intake and execution approval.
2. `Майстер Креслень (Solution Architect)` -> localize root cause and recovery design.
3. `Ловець Багів (TDD QA)` -> add regression test for approve flow on LLM 429.
4. `Кодоковаль (Developer)` -> implement graceful default and non-crashing response path.
5. `Вартовий Якості (Code Reviewer)` -> confirm root-cause fix, no symptom-only patch.
6. `Бойовий Прогін (Runner Backtest)` -> smoke validation of graph continuation.
7. `Пан Гілка (Git Flow Manager)` -> preflight/branch compliance.
8. `Хранитель Писань (Documentation Owner)` -> post-acceptance docs alignment.

## Acceptance Criteria
- `POST /api/chat/approve` never crashes on OpenAI 429.
- QA node degrades to deterministic default message on LLM failures.
- API returns stable JSON with `success=false` only for non-recoverable conditions.
- Regression test covers the 429 path and verifies no unhandled throw.
