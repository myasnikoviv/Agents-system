# Agent System Infrastructure & Boundary Map

## 1. Physical Boundaries
| Repository | Role | Data Ownership |
|------------|------|----------------|
| `Agents system` | Infrastructure & Runtime | Global Env, Orchestration Scripts, Project Manifests |
| `trade_bot` | Business Logic / Project | Trade Strategies, Local Docs, Feature Logic |

## 2. Infrastructure Services (Managed by `Agents system`)
| Service | Default Port | Responsibility | Runtime Check (MCP) |
|---------|--------------|----------------|---------------------|
| Plane API | 3000 | Issue Tracking / Project Management | `plane` |
| Redis | 6379 | State Memory (Long-term) | `redis` |
| LangGraph | 2024 (Studio) | Graph Execution Engine | N/A |
| OpenHands | 8000 (Docker) | Agent Execution Sandbox | `playwright` |

## 3. Configuration & Environment
- **Global Config**: `Agents system/.env` (Contains OpenAI, LangSmith, Plane, Redis credentials).
- **Project Config**: `Agents system/projects/<project-id>/cockpit_config.json` (Managed by Agent System).
- **Discovery**: `DynamicDiscoveryService` scans `workspacePath/generated/` for pipelines and skills.

## 4. Isolation Policy
1. **No CWD Dependency**: All runtime services must accept an explicit `workspacePath`.
2. **No Mixed Envs**: `trade_bot/.env` should only contain strategy-specific keys (e.g., Exchange APIs).
3. **No Cross-Repo Includes**: `Agents system` should not import from `trade_bot` directly; it should interact via discovered manifests.
