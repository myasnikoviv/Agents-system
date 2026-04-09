🟪 Sprint 29 — Tasks

Theme: Settings IA Remediation + System Boundaries Enforcement
Source of truth:
	•	docs/sprints/System Boundary Decisions v1.md
	•	docs/sprints/Settings IA Remediation Spec v1.md

⸻

🟫 EPIC 1 — Runtime Cleanup (CRITICAL)

⸻

🎫 AGSYS-2901 — Remove Quasi-linear Runtime

Description
Повністю видалити quasi-linear execution path.

Acceptance Criteria
	•	всі quasi-linear handlers видалені
	•	runtime router більше не містить branching
	•	немає fallback logic
	•	tests не посилаються на quasi-linear

Handoff
PM → Backend → QA → PM

⸻

🎫 AGSYS-2902 — Remove Mock Runtime

Description
Повністю видалити mock mode.

Acceptance Criteria
	•	mock execution code видалений
	•	debug flags видалені
	•	UI згадки відсутні
	•	tests оновлені

Handoff
PM → Backend → QA → PM

⸻

🎫 AGSYS-2903 — Enforce Single Runtime (Multiple Agents)

Description
Зробити multi-agent runtime єдиним execution path.

Acceptance Criteria
	•	runtime не має альтернатив
	•	router deterministic
	•	всі execution flows через multi-agent
	•	system не має runtime switch

Handoff
PM → Backend → Runtime → QA → PM

⸻

🟫 EPIC 2 — Settings Refactor (Client Layer)

⸻

🎫 AGSYS-2904 — Refactor Workspace Settings API

Description
Очистити settings API від non-client полів.

Acceptance Criteria
	•	залишились тільки:
	•	language
	•	appearance
	•	notifications
	•	providers
	•	model selection
	•	runtime/gov/system поля відсутні
	•	backward compatibility не потрібна

Handoff
PM → Backend → QA → PM

⸻

🎫 AGSYS-2905 — Workspace Settings UI Cleanup

Description
Переробити UI settings.

Acceptance Criteria
	•	немає runtime controls
	•	немає debug controls
	•	UI відповідає spec
	•	clean UX

Handoff
PM → Frontend → QA → PM

⸻

🟫 EPIC 3 — Governance Center (NEW CORE)

⸻

🎫 AGSYS-2906 — Governance Data Model

Description
Створити data model для governance.

Acceptance Criteria
	•	rules entity
	•	loops entity
	•	profiles entity
	•	artifacts entity
	•	overrides entity

Handoff
PM → Backend → Architect → QA → PM

⸻

🎫 AGSYS-2907 — Governance API Layer

Description
Реалізувати API для governance.

Acceptance Criteria
	•	GET rules
	•	PATCH rules
	•	GET loops
	•	POST loops
	•	PATCH loops
	•	GET profiles

Handoff
PM → Backend → QA → PM

⸻

🎫 AGSYS-2908 — Governance UI (MVP)

Description
Створити Governance Center UI.

Acceptance Criteria
	•	rules list
	•	enable/disable rules
	•	loops view/edit
	•	profiles selection
	•	basic UX (без polishing)

Handoff
PM → Frontend → QA → PM

⸻

🎫 AGSYS-2909 — Governance Engine Integration

Description
Інтегрувати governance з runtime.

Acceptance Criteria
	•	rules реально впливають на execution
	•	loops виконуються
	•	overrides працюють
	•	no stub logic

Handoff
PM → Backend → Runtime → QA → PM

⸻

🟫 EPIC 4 — Control Plane Isolation

⸻

🎫 AGSYS-2910 — Extract Control Plane APIs

Description
Винести control plane API в окремий namespace.

Acceptance Criteria
	•	/system/* endpoints
	•	відсутні в client API
	•	розділення clear

Handoff
PM → Backend → QA → PM

⸻

🎫 AGSYS-2911 — Restrict Control Plane Access

Description
Обмежити доступ.

Acceptance Criteria
	•	тільки owner/admin
	•	auth enforced
	•	audit logs

Handoff
PM → Backend → Security → QA → PM

⸻

🎫 AGSYS-2912 — Remove Swarm from Client UI

Description
Видалити swarm controls з user UI.

Acceptance Criteria
	•	кнопки відсутні
	•	немає доступу через client
	•	тільки через control plane

Handoff
PM → Frontend → QA → PM

⸻

🟫 EPIC 5 — MCP & Workbench Isolation

⸻

🎫 AGSYS-2913 — MCP Scope Model

Description
Реалізувати scope system.

Acceptance Criteria
	•	global scope
	•	tenant scope
	•	workspace scope
	•	session scope

Handoff
PM → Backend → QA → PM

⸻

🎫 AGSYS-2914 — MCP Access Enforcement

Description
Обмежити доступ до MCP.

Acceptance Criteria
	•	unsafe tools ізольовані
	•	mutable tools ізольовані
	•	policy enforced

Handoff
PM → Backend → QA → PM

⸻

🟫 EPIC 6 — Git / Project Profile System

⸻

🎫 AGSYS-2915 — Project Profiles System

Description
Впровадити profiles.

Acceptance Criteria
	•	engineering profile
	•	non-engineering profile
	•	configurable

Handoff
PM → Backend → QA → PM

⸻

🎫 AGSYS-2916 — Git Policy Integration

Description
Прив’язати git policy до профілю.

Acceptance Criteria
	•	git isolation не global
	•	працює через profile
	•	вимикається для non-code проектів

Handoff
PM → Backend → QA → PM

⸻

🟫 EPIC 7 — Repository-first Onboarding

⸻

🎫 AGSYS-2917 — Repo Onboarding Flow

Description
Впровадити onboarding через repo.

Acceptance Criteria
	•	GitHub/Git інтеграція
	•	OAuth/PAT
	•	repo detection

Handoff
PM → Backend → QA → PM

⸻

🎫 AGSYS-2918 — Bootstrap Flow

Description
Fallback при відсутності config.

Acceptance Criteria
	•	auto template
	•	read-only mode
	•	UX зрозумілий

Handoff
PM → Backend → Frontend → QA → PM

⸻

🟫 EPIC 8 — API Restructuring

⸻

🎫 AGSYS-2919 — Split API Domains

Description
Розділити API.

Acceptance Criteria
	•	/workspace/*
	•	/governance/*
	•	/system/*
	•	немає змішування

Handoff
PM → Backend → QA → PM

⸻

⸻

🟫 EPIC 9 — Legacy Cleanup

⸻

🎫 AGSYS-2920 — Remove Dead Settings

Description
Видалити legacy settings.

Acceptance Criteria
	•	немає unused fields
	•	немає hidden toggles
	•	немає stub config

Handoff
PM → Backend → QA → PM

⸻

🎫 AGSYS-2921 — Remove Legacy UI

Description
Видалити старі UI частини.

Acceptance Criteria
	•	старий settings UI видалений
	•	немає legacy screens
	•	немає dead routes

Handoff
PM → Frontend → QA → PM

⸻

⸻

🧠 Definition of Done — Sprint 29

⸻

Спринт завершений, якщо:
	•	тільки multi-agent runtime існує
	•	settings очищені
	•	governance center працює
	•	control plane ізольований
	•	MCP scopes працюють
	•	repo onboarding працює
	•	API розділений
	•	legacy повністю видалений

⸻

💥 Результат після Sprint 29

⸻

До:
	•	змішані налаштування
	•	debug leakage
	•	кілька runtime моделей

⸻

Після:
	•	чиста SaaS-ready архітектура
	•	governance як ядро
	•	control plane ізольований
	•	predictable system

⸻

🔥 Найважливіше

⸻

Sprint 29 =

❗ перехід від “prototype system”
до
реальної продуктної платформи

⸻
