Супер, це дуже сильний репорт — і головне, він чітко показує:

❗ у вас вже є ядро governance (декларативне)
але ще немає product layer (керування, UI, lifecycle)  ￼

Тобто Sprint 24 — це не “ще один технічний спринт”, а:

🔥 перехід від engine → до керованої системи (policy platform)

⸻

🟪 SPRINT 24 — Policy Management & Loop System (Productization Layer)

⸻

🎯 Goal

Перетворити governance систему з:

⚠️ config-driven (YAML + code)

в

✅ керовану користувачем систему (UI + API + lifecycle)

⸻

🧠 Core Idea

З твого репорту:
	•	rules є ✅
	•	scoping є (частково) ✅
	•	overrides є ✅
	•	але:
	•	❌ немає catalog API
	•	❌ немає lifecycle management
	•	❌ немає UI
	•	❌ extensibility через код

👉 це означає:

система існує, але не є керованою як продукт

⸻

🔥 Основні напрямки спринта

⸻

1. Rule Catalog API (Core Layer)

Зробити:
	•	API для:
	•	list rules
	•	get rule
	•	create rule
	•	update rule
	•	disable rule

👉 зараз цього нема  ￼

⸻

2. Rule Metadata Model

Додати до кожного rule:
	•	name
	•	description
	•	version
	•	owner
	•	tags
	•	createdAt / updatedAt

👉 зараз цього нема (gap у репорті)

⸻

3. Rule Lifecycle Management

Зробити:
	•	create rule
	•	update rule
	•	disable rule
	•	delete rule (optional)

👉 зараз тільки через YAML/code

⸻

4. Project Policy Editor

Зробити:
	•	enable/disable rules per project
	•	override config per project
	•	rule visibility per project

👉 зараз partial через config

⸻

5. Scope Model (Formalization)

Явно визначити:
	•	global rules
	•	project rules
	•	session/task rules

	•	precedence:

session > project > global

👉 зараз implicit / partial

⸻

6. Rule Catalog UI (Cockpit)

Додати:
	•	список rules
	•	статус (enabled/disabled)
	•	scope
	•	metadata

⸻

7. Rule Editor UI

Мінімально:
	•	edit evidence
	•	edit trigger
	•	edit thresholds
	•	enable/disable

⸻

8. Evaluator Contract (Extensibility)

Зробити:
	•	abstract evaluator interface
	•	registry evaluator types
	•	plugin-ready design

👉 зараз code-only

⸻

🧾 Definition of Done

Sprint 24 завершений, якщо:
	•	rules видно в UI
	•	rules можна вмикати/вимикати per project
	•	rules можна змінювати без коду
	•	є API для catalog
	•	є scope model (global/project/session)
	•	система не залежить від YAML edits руками

⸻

🔧 TASK BREAKDOWN (Plane-ready)

⸻

🟫 EPIC 1 — Rule Catalog API

⸻

🎫 AGSYS-2401 — Rule Catalog Read API

Description:
Додати API:
	•	GET /api/governance/rules

Acceptance Criteria:
	•	повертає всі rules
	•	включає metadata
	•	включає scope info

⸻

🎫 AGSYS-2402 — Rule Get API
	•	GET /api/governance/rules/:id

⸻

🎫 AGSYS-2403 — Rule Create API

Acceptance Criteria:
	•	створення rule без правки YAML
	•	валідація schema
	•	запис у storage

⸻

🎫 AGSYS-2404 — Rule Update API
	•	update evidence / trigger / thresholds

⸻

🎫 AGSYS-2405 — Rule Disable API
	•	disable rule globally або per project

⸻

⸻

🟫 EPIC 2 — Rule Metadata Model

⸻

🎫 AGSYS-2406 — Extend Rule Schema

Додати:
	•	name
	•	description
	•	version
	•	owner
	•	tags

⸻

🎫 AGSYS-2407 — Metadata Persistence
	•	зберігати metadata у registry/storage

⸻

⸻

🟫 EPIC 3 — Project Policy Management

⸻

🎫 AGSYS-2408 — Project Policy API
	•	GET /api/projects/:id/policy
	•	POST update policy

⸻

🎫 AGSYS-2409 — Enable/Disable Rules per Project

Acceptance Criteria:
	•	rule enabled в одному проекті
	•	disabled в іншому

⸻

🎫 AGSYS-2410 — Project Rule Overrides
	•	thresholds
	•	evidence overrides

⸻

⸻

🟫 EPIC 4 — Scope Model

⸻

🎫 AGSYS-2411 — Scope Hierarchy Implementation
	•	global
	•	project
	•	session

⸻

🎫 AGSYS-2412 — Scope Resolution Engine

Acceptance Criteria:
	•	precedence працює
	•	conflict resolution deterministic

⸻

⸻

🟫 EPIC 5 — Cockpit UI (Rules)

⸻

🎫 AGSYS-2413 — Rule List UI

Показати:
	•	rules
	•	status
	•	scope
	•	metadata

⸻

🎫 AGSYS-2414 — Rule Toggle UI
	•	enable/disable

⸻

🎫 AGSYS-2415 — Project Policy UI
	•	список активних rules для проекту

⸻

⸻

🟫 EPIC 6 — Rule Editor UI

⸻

🎫 AGSYS-2416 — Rule Editor (Basic)

Мінімум:
	•	trigger
	•	evidence
	•	thresholds

⸻

🎫 AGSYS-2417 — Validation UI
	•	schema validation
	•	error display

⸻

⸻

🟫 EPIC 7 — Evaluator Extensibility

⸻

🎫 AGSYS-2418 — Evaluator Interface
	•	abstract contract

⸻

🎫 AGSYS-2419 — Evaluator Registry
	•	map evaluator types

⸻

🎫 AGSYS-2420 — Safe Evaluator Expansion
	•	безпечне додавання нових evaluator-ів

⸻

⸻

🟫 EPIC 8 — Validation

⸻

🎫 AGSYS-2421 — Rule Lifecycle Test Suite

Перевірити:
	•	create
	•	update
	•	disable
	•	project override

⸻

🎫 AGSYS-2422 — Scope Resolution Tests
	•	global vs project vs session

⸻

💥 Ключова суть Sprint 24

⸻

До Sprint 24:
	•	система = engine

Після Sprint 24:
	•	система = platform

⸻

І найважливіше

Після цього спринта ти зможеш:

🔥 “побачив проблему → додав loop → увімкнув → система змінилась”

без:
	•	коду
	•	redeploy
	•	ручного YAML

⸻
