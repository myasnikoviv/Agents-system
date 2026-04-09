# Settings & UI Audit Report (Client vs Owner)

Date: 2026-04-09  
Scope: Cockpit Settings tabs + main cockpit controls (left rail, composer/footer runtime controls)  
Code baseline reviewed: `frontend/src/components/cockpit/CockpitSettingsPage.tsx`, `frontend/src/components/cockpit/CockpitPage.tsx`, `src/server/routes/providerSettingsRoutes.ts`, `src/server/agentSystemBackend.ts`, `src/server/routes/chainProjectRoutes.ts`

## 1) Executive Summary

- Поточна сторінка налаштувань побудована як **Codex-style scaffold**, і це прямо задекларовано в UI (`Codex-style settings IA scaffold with functional controls`).
- Частина табів реально працює (підтягування/збереження через `/api/cockpit/settings/:section`), але значна частина полів має лише ефект "persisted state", без підтвердженого впливу на runtime.
- Є змішування рівнів:
  - `Client/User settings` (те, що має керувати кінцевий користувач).
  - `Owner/Platform settings` (операційка, governance, runtime infra, worktree/git policy, service control).
- Для SaaS-режиму поточна IA потребує розділення на два простори:
  - **Workspace Settings (Client)**
  - **Control Plane / Platform Console (Owner/Admin)**

## 2) Tab-by-Tab Audit (Settings)

| Area | Item | Current status | Evidence | Belongs to | Recommendation |
|---|---|---|---|---|---|
| `general` | `defaultOpenBehavior`, `language`, `commandDetail`, `executionSpeed` | Saved via API/localStorage, але не знайдено споживання в runtime flow | Declared + saved in `CockpitSettingsPage.tsx`; no usages outside settings (`rg` search) | Client (частково) | Залишити лише `language`; інше або підв'язати до реального UX, або видалити |
| `general` | `runtimeMode` (`mock/linear/multiple_agents`) | Реально впливає на `/api/chat` payload (`executionMode`) | `CockpitPage.tsx` reads `RUNTIME_MODE_KEY`; backend `/api/chat` applies mode | Owner (для debug), не Client | Перенести в Owner console. Для клієнта прибрати/сховати |
| `appearance` | theme/density/accent/fontScale | Persisted, явної інтеграції в глобальний theme engine не підтверджено | Settings-only usages | Client | Залишити, але довести до реального застосування в UI tokens |
| `personalization` | assistantName, autoApproveSafeSteps, showHints, confirmLongActions | Persisted only, без runtime hooks | Settings-only usages | Client | Залишити мінімум (`showHints`), інше або реалізувати, або прибрати |
| `usage` | detailLevel, notifyOnCompletion, showTokenStats | Persisted only, без системного впливу | Settings-only usages | Client | Реалізувати показ token stats/notifications або видалити контролі |
| `mcp-servers` | health/workbench/inventory | Частково заглушка/UI shell; є прямий текст `UI-first shell`; test server uses generic `/api/health` | `CockpitSettingsPage.tsx` mcp section | Owner | Повністю винести в Owner console. Для client не показувати |
| `configuration` | Executor backend/provider/model | Реально працює: збереження в `executor`, sync runtime selection/config | `/api/cockpit/settings/executor`, `/api/cockpit/providers/select`, sync in backend | Mixed | Розділити: user-level model choice в Client; runtime engine wiring в Owner |
| `configuration` | OpenHands health check | Реально працює (`/providers/openhands/health`) | provider routes | Owner/Support | Залишити тільки в Owner console |
| `configuration` | Test End-to-End LLM | Реально працює через external executor (`/providers/test-message`) | provider routes | Owner/Support + maybe Client self-test | Для Client зробити спрощений "Test my provider key" без dev-телеметрії |
| `configuration` | CLI status/test/login | У standalone частково disabled/заглушка (`test unavailable`, `login not implemented`) | provider routes explicit responses | Owner (dev) | У SaaS client UX прибрати; залишити лише там, де справді є CLI control plane |
| `governance` | Rules/policy/evaluators/loops/history/force loop | Реальна система керування, не заглушка | multiple `/api/governance/*` endpoints | Owner/Admin | Винести з user settings у Platform Governance Console |
| `git` | enforcePreflight/worktree isolation/cleanup | Persisted settings; не виявлено прямого enforcement від цих toggle-ів | settings-only usages | Owner | Або підв'язати до runtime guard, або прибрати як фейкові toggle |
| `environment` | executionMode (sandbox/full-access), allowNetwork, defaultShell | Persisted only; runtime access policy керується окремо runtime footer | settings-only + runtime footer separate | Owner | Прибрати з Client. В Owner звести в єдине джерело правди |
| `worktrees` | basePath/autoPrune/strictOneTicket | Persisted only | settings-only usages | Owner | Винести в Owner console або реалізувати реальний policy engine |
| `archived-threads` | retention/includeArtifacts | Persisted only | settings-only usages | Owner or Client (if per-workspace archive policy) | Визначити policy owner; зараз виглядає як заглушка |

## 3) Cockpit Main UI Audit (Sidebar + Composer + Footer)

| Area | Element | Current status | Belongs to | Recommendation |
|---|---|---|---|---|
| Left rail | Projects/threads CRUD | Реально працює через `/api/cockpit/chains*` + project selection | Client | Keep |
| Left rail | Worktree/project binding effects | Реально змінює runtime footer branch/worktree on project select | Owner+Client mixed | Зберегти, але branch/worktree details сховати з client view |
| Composer | Catalog popover (agents/pipelines/skills tokens) | Реально підтягує `/api/cockpit/catalog` | Power user / Owner | Для basic client приховувати advanced directives (`@`, `/`, `#`) |
| Composer | Provider/model picker | Реально змінює runtime selection | Client (limited) | Keep, але обмежити дозволені провайдери/моделі per plan |
| Composer footer | Execution target local/remote | Працює через `/api/cockpit/runtime-footer`, але capabilities зараз `executionTargets: ['local']` | Owner | Для SaaS client прибрати (нема сенсу local/remote toggle) |
| Composer footer | Access policy full-access/sandbox | Працює як runtime footer state; для SaaS недоречно exposing | Owner | Прибрати з client UI, залишити internal debug |
| Composer footer | Branch/worktree/preflight quick actions | Реально читається/копіюється | Owner/devops | Винести з основного chat UX у Owner debug panel |
| Right panel | Swarm runtime board/controls | Реальні runtime дані + control actions | Owner/ops | У client версії сховати або дати read-only simplified status |

## 4) What Is Clearly Stub/Placeholder Today

1. `mcp-servers` inventory/testing блок має явний `UI-first shell`, частина тестів не є конкретним MCP integration test.
2. CLI auth/test endpoints у standalone backend повертають `not implemented/unavailable`.
3. Багато toggle у `general/personalization/usage/git/environment/worktrees/archived-threads` наразі лише зберігаються, але не мають підтвердженого впливу на runtime.

## 5) Required Product Split (Target IA)

## 5.1 Workspace Settings (Client-facing)

Keep here:
- Language / locale.
- Provider credentials (user-scoped) + "Test provider".
- Model selection (within tenant-allowed catalog).
- UI appearance (if truly applied).
- Notification preferences (if truly applied).

Remove from here:
- Runtime mode (`mock/linear/multiple_agents`).
- Sandbox/full-access, shell/network.
- Branch/worktree/preflight internals.
- Governance loops/rules/evaluators.
- MCP topology and service lifecycle controls.

## 5.2 Platform Control Plane (Owner/Admin-facing)

Move here:
- Governance center (rules, loops, evaluator registry, force actions, history).
- Runtime mode strategy and execution routing.
- Environment/worker lifecycle, queue pressure, health dashboards.
- Git/worktree policy enforcement and audits.
- MCP server inventory and connection diagnostics.
- Swarm controls (pause/restart/kill/rebalance) and detailed telemetry.

## 6) Additional Settings To Add

| New setting | Scope | Why |
|---|---|---|
| Tenant model allowlist | Owner | Керування cost/risk per client |
| Token/cost guardrails (hard limits) | Owner + optional client caps | SaaS economics and abuse control |
| Retry/timeout policy profiles | Owner | Стабільність без ручних hotfix |
| Error transparency mode (user-safe diagnostics) | Client | Краща UX-пропагація помилок провайдера |
| Data retention policy (threads/artifacts) | Owner with client-visible SLA | Compliance / trust |
| Feature flags per workspace | Owner | Безпечний rollout |
| Role-based visibility for advanced UI controls | Owner | Щоб client не бачив internal/debug controls |

## 7) Priority Remediation Plan

1. **P0 IA split:** рознести `Settings` на `Workspace Settings` і `Control Plane`.
2. **P0 Hide unsafe/dev controls from client:** runtime footer access policy, branch/worktree, execution target, runtime mode.
3. **P1 Remove/label stubs:** де поки немає runtime effect — або прибрати, або явно позначити "Coming soon / no runtime effect".
4. **P1 Provider UX hardening:** уніфікований error mapping provider -> user-friendly message + diagnostic code.
5. **P2 Complete real binding for retained preferences:** usage/personalization/general toggles.

## 8) Direct Answers To Your Key Questions

- Чи потрібно все, що зараз у вкладках, для вашої SaaS-ідеї? **Ні.** Значна частина — внутрішні owner/dev controls або scaffolding.
- Чи треба розділяти user vs owner налаштування? **Так, обов'язково**, і краще вже зараз.
- Чи є в UI елементи, що не варто показувати клієнту (типу `sandbox/full-access`)? **Так**, це має бути owner/internal only.

## 9) Proposed Next Artifact

Після вашого підтвердження логічно зробити наступний крок: `Settings IA Remediation Spec` з конкретним списком:
- що видаляємо,
- що переносимо в owner console,
- що залишаємо в client settings,
- які API endpoint-и залишаються client-public, а які admin-only.

