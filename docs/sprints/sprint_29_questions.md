🟪 SPRINT 29 — FINAL VALIDATION PACK

Theme: Settings IA Remediation + System Boundaries Enforcement

⸻

🎯 Ціль перевірки

Підтвердити, що:
	•	❗ система повністю перейшла на multi-agent runtime
	•	❗ ніякого legacy більше не існує
	•	❗ чітко розділені 3 шари: Workspace / Governance / Control Plane
	•	❗ governance — реально впливає на execution
	•	❗ control plane ізольований
	•	❗ API і UI більше не змішані

⸻

🟫 SECTION 1 — Runtime (NO LEGACY GUARANTEE)

⸻

1.1 Чи залишився тільки один runtime?
	•	існує тільки multi-agent execution
	•	немає runtime switch
	•	немає config для вибору режиму

⸻

1.2 Чи повністю видалений quasi-linear?

Перевірити:
	•	немає коду
	•	немає згадок
	•	немає default
	•	немає tests

⸻

1.3 Чи повністю видалений mock?
	•	немає mock execution
	•	немає debug runtime flags
	•	немає mock UI

⸻

1.4 Чи немає прихованого legacy?

Сценарій:
	•	grep по проекту

Очікування:
	•	quasi, mock, default не існують
	•	немає dead code paths

⸻

🟫 SECTION 2 — Workspace Settings (CLIENT PURITY)

⸻

2.1 Чи settings чисто client-level?
	•	language
	•	appearance
	•	notifications
	•	providers
	•	models

⸻

2.2 Чи видалені всі system-level поля?
	•	runtime mode ❌
	•	execution target ❌
	•	sandbox ❌
	•	git controls ❌
	•	MCP ❌
	•	swarm ❌

⸻

2.3 Чи UI відповідає принципу “safe UX”?
	•	немає low-level controls
	•	немає debug controls
	•	немає “страшних” опцій

⸻

🟫 SECTION 3 — Governance Center (REAL, NOT FAKE)

⸻

3.1 Чи існує Governance Center?
	•	окремий route
	•	окремий UI
	•	не частина settings

⸻

3.2 Чи можна керувати rules?
	•	enable/disable
	•	scope
	•	persistence

⸻

3.3 Чи loops реально працюють?

Сценарій:
	•	змінити loop

Очікування:
	•	execution змінюється
	•	не просто UI

⸻

3.4 Чи governance впливає на runtime?
	•	rules виконуються
	•	loops тригеряться
	•	overrides працюють

⸻

3.5 Чи немає stub governance?
	•	немає “псевдо логіки”
	•	немає unused fields
	•	немає disconnected config

⸻

🟫 SECTION 4 — Control Plane Isolation

⸻

4.1 Чи control plane повністю відділений?
	•	/system/* API
	•	окремий namespace
	•	не змішується з client

⸻

4.2 Чи клієнт не має доступу?
	•	UI не містить control plane
	•	API захищений
	•	RBAC enforced

⸻

4.3 Чи swarm винесений?
	•	немає в chat UI
	•	немає в settings
	•	тільки control plane

⸻

🟫 SECTION 5 — MCP / Workbench Isolation

⸻

5.1 Чи реалізовані scopes?
	•	global
	•	tenant
	•	workspace
	•	session

⸻

5.2 Чи доступ обмежений?
	•	unsafe tools ізольовані
	•	mutable tools ізольовані
	•	policy enforced

⸻

5.3 Чи немає “global everything”?
	•	MCP не доступний всюди
	•	secrets не витікають

⸻

🟫 SECTION 6 — Project Profiles & Git Policy

⸻

6.1 Чи існують profiles?
	•	engineering
	•	non-engineering
	•	selectable

⸻

6.2 Чи git не глобальний?
	•	git isolation не forced
	•	залежить від profile

⸻

6.3 Чи non-code проект працює без git?
	•	не ламається
	•	не вимагає preflight

⸻

🟫 SECTION 7 — Repository-first Onboarding

⸻

7.1 Чи onboarding через repo?
	•	Git інтеграція
	•	repo selection
	•	auth працює

⸻

7.2 Чи bootstrap працює?

Сценарій:
	•	repo без config

Очікування:
	•	template пропонується
	•	read-only mode можливий
	•	UX зрозумілий

⸻

7.3 Чи local mode не primary?
	•	не дефолтний
	•	не SaaS path

⸻

🟫 SECTION 8 — API Architecture

⸻

8.1 Чи API розділений?
	•	/workspace/*
	•	/governance/*
	•	/system/*

⸻

8.2 Чи немає змішаних endpoint-ів?
	•	governance не в settings
	•	system не в workspace

⸻

8.3 Чи API відповідає ролям?
	•	client → workspace
	•	admin → governance
	•	owner → system

⸻

🟫 SECTION 9 — Legacy Cleanup (CRITICAL)

⸻

9.1 Чи видалені старі settings?
	•	немає dead fields
	•	немає hidden flags

⸻

9.2 Чи видалений старий UI?
	•	немає старих screens
	•	немає dead routes

⸻

9.3 Чи код чистий?
	•	немає unused services
	•	немає commented legacy
	•	немає “потім приберемо”

⸻

🟫 SECTION 10 — System Behavior

⸻

10.1 Чи система predictable?
	•	немає hidden режимів
	•	немає default logic
	•	немає side-effects

⸻

10.2 Чи поведінка визначається governance?
	•	rules → execution
	•	loops → behavior
	•	profiles → flow

⸻

10.3 Чи user не може зламати систему?
	•	немає unsafe toggles
	•	немає raw control

⸻

🟫 SECTION 11 — Reality Check

⸻

❗ Питання 1
	•	Чи система стала простішою?

⸻

❗ Питання 2
	•	Чи зникло “меню для розробника”?

⸻

❗ Питання 3
	•	Чи всі налаштування тепер мають чіткого owner?

⸻

❗ Питання 4
	•	Чи можна це продавати як SaaS без сорому?

⸻

❗ Питання 5
	•	Чи немає прихованого legacy?

⸻

🧾 REQUIRED OUTPUT

## Sprint 29 Validation Report

Overall: READY / PARTIAL / NOT READY

### Runtime
...

### Workspace Settings
...

### Governance Center
...

### Control Plane
...

### MCP Isolation
...

### Profiles & Git
...

### Onboarding
...

### API
...

### Legacy Cleanup
...

### Critical Gaps
...

### Recommendation
...


⸻

💥 Ключовий критерій Sprint 29

⸻

Sprint 29 вважається завершеним ТІЛЬКИ якщо:
	•	❗ legacy runtime повністю знищений
	•	❗ settings очищені
	•	❗ governance реально працює
	•	❗ control plane ізольований
	•	❗ API розділений
	•	❗ system predictable

⸻

🔥 Якщо коротко

⸻

❗ Sprint 29 — це момент, коли система або стає продуктом,
або залишається прототипом назавжди

⸻