# TKT-53: LangGraph Server Stability (Startup Script & .env Fix)

## Business Context
The LangGraph server is crucial for agent orchestration. Currently, it lacks a standard startup mechanism, leading to inconsistencies in background processes and environment variables between dev environments.

## Technical Scope
1. **Startup Script**: Create `scripts/langgraph_up.sh` to:
   - Validate `.env` variables (`REDIS_URL`, `OPENAI_API_KEY`, etc.).
   - Kill any stale LangGraph processes.
   - Start `npx langgraph dev` in background and tail output to `/tmp/logs/langgraph.log`.
2. **Environment Synchronization**: Consolidate `.env.example` to include all runtime dependencies required by the graph.
3. **Health Check**: Add a basic `npm run health` or endpoint `/api/health` that returns LangGraph readiness status.

## Expected Handoff Pipeline
1. **PM Orchestrator** -> Intake.
2. **DevOps Engineer** (`Техно-Рятівник`) -> Implementation of scripts.
3. **QA** (`Ловець Багів`) -> Verification of multiple restarts and reliability.

## Acceptance Criteria
- Running `scripts/langgraph_up.sh` consistently brings the graph online.
- Stale processes are cleaned up correctly.
- Missing environment variables are detected before startup.
