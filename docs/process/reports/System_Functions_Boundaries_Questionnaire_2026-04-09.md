# System Functions Boundaries Report (Questionnaire)

Date: 2026-04-09  
Source context: follow-up to `Settings_Audit_Client_vs_Owner_2026-04-09.md` + owner clarifications on SaaS target model.

## 1) Purpose

Цей документ не фіксує фінальні рішення.  
Його мета: винести спірні системні функції в окремий decision-backlog із чіткими питаннями для команди.

## 2) What Is Already Fixed (Not Re-discussed)

- Аудит заглушок/placeholder-елементів залишається валідним і не переробляється.
- Базовий поділ `Client UX` vs `Owner/Internal controls` залишається корисним, але для частини системних функцій потрібне деталізоване шарування.

## 3) Updated SaaS Target Model (from product direction)

1. Проєкт у SaaS має підключатися насамперед як **repository**, не як локальна тека.
2. Підтримка локальних тек можлива лише як окремий `local/dev` режим сумісності.
3. Потрібен onboarding-процес: визначення агентських файлів, pipeline-контракту, декларативних rules/loops/evaluators.
4. Для різних доменів (engineering/marketing/ops) мають бути різні дефолтні системні loop-профілі.
5. Частина control-plane функцій може бути:
- системною і невидимою для юзера,
- tenant-level конфігурованою,
- workspace/project-level конфігурованою.

## 4) Proposed Layer Model For Decisions

- `L0 Platform (global owner)`: platform runtime, безпека, multi-tenant ізоляція, billing/cost guardrails.
- `L1 Tenant (organization admin)`: організаційні політики, allowlists, compliance, інтеграції.
- `L2 Workspace/Project (team admin)`: проектні pipeline/rules/loops, доступні tool profiles.
- `L3 Session/Run (operator/user)`: runtime overrides у межах дозволених політик.

## 5) Decision Areas With Open Questions

## 5.1 Repository Onboarding (replace local folder-first model)

### Current gap
- Поточний UX базується на додаванні локальної теки/worktree.
- Для SaaS це не є базовим сценарієм.

### Open questions
1. Який primary onboarding path затверджуємо для SaaS:
- `Git provider app install` (GitHub/GitLab/Bitbucket style), чи
- `PAT/OAuth per workspace`, чи
- змішаний варіант?
2. Чи лишається `Local folder` як офіційний режим (dev-only), і де він вмикається?
3. Хто визначає project root + agents root + generated root:
- авто-детект,
- wizard,
- обов'язкова декларація в `project manifest`?
4. Яка поведінка, якщо в репозиторії немає агентських файлів:
- блокування запуску,
- авто-bootstrap шаблону,
- read-only/research режим?

### Decision owner candidates
- Platform architect + PM + DevOps.

## 5.2 Governance Center (rules/loops/evaluators)

### Why this is disputed
- Це не просто owner-console; це частина продуктового value (декларативне керування поведінкою системи).

### Open questions
1. Який мінімальний governance UI має бути доступний на `workspace/project` рівні?
2. Що з governance лишається `platform-only`:
- системні safety-rules,
- hard constraints,
- compliance rails?
3. Чи може user вимикати системні default loops, і які не можна вимикати ніколи?
4. Яка модель успадкування:
- `system defaults -> tenant profile -> project overrides -> run overrides`?
5. Як версіонуємо декларативні rules/loops:
- у repo,
- у control-plane DB,
- гібридно?

### Decision owner candidates
- PM + Solution Architect + Domain/Governance owner.

## 5.3 Runtime Mode Strategy (mock/quasi-linear/multiple agents)

### Current situation
- Налаштування mode exposed у загальних settings; це більше системна операційна опція.

### Open questions
1. Чи runtime mode є:
- platform feature flag,
- tenant option,
- project option,
- або debug-only?
2. Чи дозволяємо перемикання mode під час активного проекту/run?
3. Чи для SaaS залишаємо user-visible mode selector, чи обираємо mode автоматично policy-движком?

### Decision owner candidates
- Platform runtime owner + PM.

## 5.4 Git/Worktree Policy Loop

### Why it matters
- Це ключовий declarative loop для engineering use-cases.

### Open questions
1. Git isolation policy має бути системною (always-on) чи конфігурованою per project?
2. Які сценарії без git (marketing/content) мають обхідний policy profile?
3. Чи user бачить ці механіки явно, чи це background orchestration?
4. Який minimum evidence contract для `git preflight` у SaaS?

### Decision owner candidates
- Engineering PM + Git-flow owner.

## 5.5 MCP / Workbench Boundaries

### Key concern
- Не всі MCP однаково shareable; потрібна багаторівнева ізоляція доступу.

### Open questions
1. Яка цільова класифікація MCP по ізоляції:
- `global shared`,
- `tenant shared`,
- `workspace isolated`,
- `session isolated`?
2. Де зберігати credentials для MCP:
- tenant secrets,
- workspace secrets,
- user secrets?
3. Чи потрібен окремий daemon/container per user/workspace для "unsafe" MCP?
4. Який policy engine вирішує доступ агента до MCP у run-time?

### Initial examples to validate
- GitHub MCP: потенційно tenant/workspace shared (залежить від токен-моделі).
- Plane MCP: частіше workspace/user scoped.
- Filesystem-like mutation MCP: session/workspace isolated.

### Decision owner candidates
- Platform security + DevOps + PM.

## 5.6 Swarm Controls (pause/restart/kill/rebalance)

### Key concern
- У multi-tenant SaaS ці контролі існують у контексті окремого ізольованого runtime-середовища.

### Open questions
1. Хто має право на swarm controls:
- platform admins only,
- tenant admins,
- project admins?
2. Чи є окрема "операторська" панель для support/SRE?
3. Які контролі дозволені user-level без ризику міжtenant впливу?
4. Як відобразити ці функції в UI без змішування із звичайним chat UX?

### Decision owner candidates
- SRE/DevOps + PM.

## 6) Candidate Configuration Profiles

## 6.1 Local/Dev Profile
- Folder-based project attach: allowed.
- Wide debug visibility: allowed.
- Runtime mode/manual controls: visible.

## 6.2 SaaS Production Profile
- Repository onboarding only.
- Role-based visibility.
- Governance + MCP + Swarm controls рознесені по рівнях прав.
- Runtime internals не змішуються з chat UX.

## 7) Suggested Decision Log Template (for team meeting)

Use one row per disputed function.

| Function | Layer candidate | User-visible? | Default state | Can override? | Who approves override? | Final decision |
|---|---|---|---|---|---|---|
| Governance loops | L2/L1 | Partial | Enabled | Limited | Tenant admin | TBD |
| MCP Plane | L2/L3 | No | Isolated | No (except owner) | Platform policy | TBD |
| Runtime mode | L0/L1 | Usually no | Auto-policy | Debug only | Platform owner | TBD |
| Git isolation loop | L2 | Optional by profile | On for engineering | Yes (profile-driven) | Project admin | TBD |

## 8) Concrete Questions List For Team Sync

1. Чи затверджуємо repository-first onboarding як єдиний production шлях?
2. Який мінімальний governance toolkit залишається доступним project admin у SaaS?
3. Які системні loop/rules є non-disableable?
4. Яка фінальна матриця ізоляції MCP по класах інструментів?
5. Де межа між `client workspace settings` і `operator control plane`?
6. Чи runtime mode selector має існувати в user UI у production?
7. Які swarm controls (якщо будь-які) дозволяємо tenant/project admin?
8. Який fallback режим для non-engineering проєктів без git-centric flow?

## 9) Next Step

Після командного рев'ю цього questionnaire створюється другий документ:
- `System_Boundaries_Decisions_v1.md` (без TBD, лише затверджені рішення + owner + rollout order).

