Супер, тоді робимо максимально практичний документ, який вже можна прямо віддати в розробку.

⸻

🟪 Settings IA Remediation Spec v1

Status: READY FOR IMPLEMENTATION
Based on: System Boundary Decisions v1

⸻

1. 🎯 Goal

Перебудувати систему налаштувань так, щоб:
	•	❗ прибрати змішування client / governance / control plane
	•	❗ прибрати всі legacy runtime речі
	•	❗ зробити чітку інформаційну архітектуру
	•	❗ підготувати систему до SaaS

⸻

2. 🧩 Target IA (Information Architecture)

⸻

🟦 1. Workspace Settings (Client-facing)

👉 те, що бачить звичайний юзер

⸻

🟨 2. Governance Center (Project-level)

👉 правила, лупи, політики

⸻

🟥 3. Control Plane (Operator-only)

👉 runtime, swarm, infra

⸻

❌ DELETE

👉 старий змішаний Settings UI

⸻

3. 🟦 Workspace Settings (NEW)

⸻

📍 Route

/workspace/settings


⸻

📦 Sections

⸻

3.1 General
	•	language
	•	locale
	•	timezone

⸻

3.2 Appearance
	•	theme
	•	UI preferences

⸻

3.3 Notifications
	•	alerts
	•	execution updates

⸻

3.4 AI Providers
	•	provider credentials
	•	provider test
	•	connection status

⸻

3.5 Model Selection
	•	allowed models only
	•	no raw provider config

⸻

3.6 Project Preferences (lightweight)
	•	default project profile
	•	preferred behavior (safe presets only)

⸻

❌ REMOVED FROM HERE
	•	runtime mode ❌
	•	execution target ❌
	•	sandbox/full-access ❌
	•	MCP config ❌
	•	swarm ❌
	•	governance rules ❌

⸻

4. 🟨 Governance Center (NEW CORE FEATURE)

⸻

📍 Route

/workspace/governance


⸻

📦 Sections

⸻

4.1 Rules / Policies
	•	список правил
	•	enable / disable
	•	scope (global/project)

⸻

4.2 Loops
	•	список loop’ів
	•	trigger conditions
	•	evidence requirements
	•	thresholds

⸻

4.3 Profiles
	•	Engineering
	•	Marketing
	•	Research
	•	Custom profiles

⸻

4.4 Overrides
	•	що дозволено юзеру
	•	runtime overrides policy

⸻

4.5 Artifacts / Evidence
	•	expected outputs
	•	validation conditions

⸻

🔒 Constraints
	•	НЕ можна створювати evaluator тип
	•	тільки використовувати існуючі

⸻

🧠 Важливо

Це:

❗ новий продуктний центр системи
❗ не “налаштування”, а ядро поведінки системи

⸻

5. 🟥 Control Plane (INTERNAL ONLY)

⸻

📍 Route

/system/control-plane

(або взагалі окремий інтерфейс)

⸻

📦 Sections

⸻

5.1 Runtime
	•	system status
	•	execution pipelines

⸻

5.2 Swarm
	•	agent list
	•	state (active/idle)
	•	restart / kill / rebalance

⸻

5.3 Services
	•	service registry
	•	health
	•	restart policy

⸻

5.4 MCP / Workbench
	•	tools inventory
	•	health checks
	•	scopes

⸻

5.5 Policies (platform-level)
	•	global rules
	•	safety constraints
	•	evaluator registry

⸻

5.6 Diagnostics
	•	logs
	•	tracing
	•	debug tools

⸻

❗ Access
	•	тільки owner / platform admin
	•	НЕ доступно клієнтам

⸻

6. 🧨 HARD REMOVALS

⸻

UI

Видалити повністю:
	•	runtime mode selector
	•	quasi-linear mentions
	•	mock mentions
	•	execution target selector
	•	sandbox/full-access toggle
	•	branch/worktree UI
	•	raw MCP UI
	•	swarm controls в chat UI

⸻

Backend

Видалити:
	•	quasi-linear execution paths
	•	mock runtime logic
	•	runtime switching logic
	•	fallback mode logic

⸻

7. 🧠 API Refactor

⸻

Before

/settings
  everything mixed


⸻

After

⸻

Workspace

GET /workspace/settings
PATCH /workspace/settings


⸻

Governance

GET /governance/rules
PATCH /governance/rules

GET /governance/loops
POST /governance/loops
PATCH /governance/loops

GET /governance/profiles


⸻

Control Plane

GET /system/services
POST /system/services/restart

GET /system/swarm
POST /system/swarm/action


⸻

8. 🧱 Data Model Changes

⸻

Add

Governance Entities
	•	rules
	•	loops
	•	profiles
	•	artifacts
	•	overrides

⸻

Update
	•	settings → тільки user-facing
	•	runtime config → перенести в control plane

⸻

9. 🧠 UX Rules

⸻

1. No Low-Level Controls

Користувач НЕ бачить:
	•	runtime mechanics
	•	infra
	•	execution internals

⸻

2. Behavior via Governance

Користувач впливає на систему через:
	•	rules
	•	loops
	•	profiles

⸻

3. Safe Defaults
	•	system працює без налаштувань
	•	governance має дефолтні профілі

⸻

10. 🔄 Migration Plan

⸻

Step 1 — Introduce new IA
	•	створити нові routes
	•	додати governance center

⸻

Step 2 — Move settings
	•	перенести client settings
	•	прибрати зайве

⸻

Step 3 — Hide legacy
	•	приховати старі controls

⸻

Step 4 — Delete legacy
	•	видалити код
	•	видалити API

⸻

Step 5 — Enforce boundaries
	•	перевірки на backend
	•	role-based access

⸻

11. 🧪 Validation Checklist

⸻

Workspace Settings
	•	тільки UX налаштування
	•	немає runtime controls

⸻

Governance Center
	•	можна керувати правилами
	•	можна керувати loop’ами
	•	є profiles

⸻

Control Plane
	•	не доступний клієнтам
	•	має всі runtime controls

⸻

Legacy
	•	нічого не залишилось
	•	немає fallback логіки

⸻

12. 💥 Expected Result

⸻

До
	•	хаос у settings
	•	змішані рівні
	•	debug leakage

⸻

Після
	•	чиста структура
	•	SaaS-ready UX
	•	governance як core
	•	control plane ізольований

⸻

🔥 Найважливіше

⸻

Цей спринт робить:

❗ перехід від “набору налаштувань”
до
керованої multi-agent платформи

⸻