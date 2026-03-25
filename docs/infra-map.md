# Agent System Infrastructure & Boundary Map

## 1. Physical Boundaries
| Repository | Role | Data Ownership |
|------------|------|----------------|
| `agent-system` | Infrastructure & Runtime | Global env, orchestration scripts, cockpit runtime, project manifests |
| `trade_bot` | Business Logic / Product App | Backtester logic, strategy DB schema, strategy UI/flows |

## 2. Infrastructure Services (Managed by `agent-system`)
| Service | Default Port | Responsibility | Runtime Check (MCP) |
|---------|--------------|----------------|---------------------|
| Plane API | 3000 | Issue Tracking / Project Management | `plane` |
| Redis | 6379 | State Memory (Long-term) | `redis` |
| LangGraph | 2024 (Studio) | Graph Execution Engine | N/A |
| OpenHands | 8000 (Docker) | Agent Execution Sandbox | `playwright` |
| Cockpit UI | 5174 | Agent cockpit frontend | Browser smoke/Playwright |

## 3. Configuration & Environment
- **Global Config**: `agent-system/.env` (OpenAI, LangSmith, Plane, Redis, runtime secrets).
- **Project Config**: `agent-system/projects/<project-id>/cockpit_config.json` (managed by Agent System).
- **Discovery**: `DynamicDiscoveryService` scans `workspacePath/generated/` for pipelines and skills.

## 4. Isolation Policy
1. **No CWD Dependency**: All runtime services must accept an explicit `workspacePath`.
2. **No Mixed Envs**: `trade_bot/.env` should only contain strategy-specific keys (e.g., Exchange APIs).
3. **No Cross-Repo Includes**: `Agents system` should not import from `trade_bot` directly; it should interact via discovered manifests.
4. **Backtester Ownership**: `trade_bot` starts only API/UI stack and does not manage LangGraph lifecycle.
