🟪 Pre-Sprint 24 Gate — Policy & Loop Management Audit

⸻

🎯 Goal

Підтвердити, що система:

❗ підтримує декларативні loop-и (rules) як керовану, розширювану і scoped систему
а не як “YAML + трохи коду”

⸻

🧠 Core Problem

Зараз у системі:
	•	rules стали декларативними ✅
	•	але НЕ зрозуміло:
	•	чи вони керовані користувачем
	•	чи вони scoped
	•	чи можна додавати нові loop-и без коду

⸻

❗ Decision Gate

Перед Sprint 24 потрібно відповісти:

❓ Чи у нас уже є Policy Management System,
чи тільки policy config + evaluators

⸻

🧩 SECTION 1 — Rule Catalog (System Level)

⸻

1.1 Rule Registry
	•	Де зберігається список всіх rules?
	•	YAML?
	•	DB?
	•	code?
	•	Чи є єдиний catalog:
	•	system rules
	•	available rules

⸻

1.2 Rule Structure

Для кожного rule:
	•	чи визначено:
	•	id
	•	name
	•	description
	•	trigger
	•	evidence
	•	evaluator
	•	enforcement action

⸻

1.3 Rule Discoverability
	•	Чи можна отримати список всіх доступних rules через API?
	•	Чи Cockpit може їх показати?

⸻

🧾 Output

Rule Catalog:
- total rules: X
- storage: YAML / DB / code
- accessible via API: yes/no


⸻

🧩 SECTION 2 — Evaluator Capabilities

⸻

2.1 Evaluator Types
	•	Які evaluator-и існують?
	•	git
	•	tokens
	•	artifacts
	•	events
	•	loop detection
	•	інші

⸻

2.2 Extensibility
	•	Чи можна додати новий evaluator:
	•	без коду?
	•	через конфіг?

⸻

2.3 Binding
	•	Як rule прив’язується до evaluator?
	•	static mapping?
	•	dynamic?

⸻

🧾 Output

Evaluators:
- built-in: [...]
- extensible: yes/no
- binding model: static/dynamic


⸻

🧩 SECTION 3 — Rule Scoping (CRITICAL)

⸻

🔥 Це найважливіша частина

⸻

3.1 Scope Levels
	•	Чи підтримуються:
	•	global rules
	•	project rules
	•	task/session rules

⸻

3.2 Project Isolation
	•	Чи один і той самий rule:
	•	може бути увімкнений в одному проекті
	•	і вимкнений в іншому?

⸻

3.3 Inheritance Model
	•	Чи є:
	•	system defaults
	•	project overrides

⸻

3.4 Rule Overrides
	•	Чи можна:
	•	override rule config per project?
	•	змінити evidence?
	•	змінити thresholds?

⸻

🧾 Output

Scopes:
- global: yes/no
- project-level: yes/no
- overrides: yes/no
- inheritance: yes/no


⸻

🧩 SECTION 4 — Rule Lifecycle Management

⸻

4.1 Create Rule
	•	Чи можна створити новий rule:
	•	через UI?
	•	через API?
	•	тільки через код?

⸻

4.2 Update Rule
	•	Чи можна змінити:
	•	evidence
	•	trigger
	•	thresholds

⸻

4.3 Delete / Disable
	•	Чи можна:
	•	вимкнути rule?
	•	видалити rule?

⸻

🔥 КРИТИЧНЕ
	•	Чи можна вимкнути system rule для конкретного проекту?

⸻

🧾 Output

Rule Lifecycle:
- create: UI/API/code
- update: UI/API/code
- disable: yes/no


⸻

🧩 SECTION 5 — Loop Execution Model

⸻

5.1 Loop Triggering
	•	Як запускається loop:
	•	event-based?
	•	stage-based?
	•	manual?

⸻

5.2 Evidence Collection
	•	Звідки береться evidence:
	•	artifacts
	•	events
	•	LLM analysis

⸻

5.3 Determinism
	•	Loop:
	•	deterministic?
	•	чи LLM-driven?

⸻

🔥 КРИТИЧНЕ
	•	Чи loop може працювати без LLM?

⸻

🧾 Output

Loop Model:
- trigger: ...
- evidence: ...
- deterministic: yes/no


⸻

🧩 SECTION 6 — UI / Cockpit Integration

⸻

6.1 Rule Visibility
	•	Чи UI показує:
	•	список rules?
	•	їх статус (enabled/disabled)?

⸻

6.2 Editing Capability
	•	Чи можна:
	•	змінити rule з UI?

⸻

6.3 Scope UI
	•	Чи видно:
	•	які rules активні для проекту?

⸻

🔥 КРИТИЧНЕ
	•	Чи можна відключити git preflight у конкретному проекті?

⸻

🧾 Output

UI:
- rule list: yes/no
- editing: yes/no
- project config: yes/no


⸻

🧩 SECTION 7 — Real Use Case Validation

⸻

Scenario 1 — Marketing Project (NO GIT)
	•	Створити проект без git
	•	Вимкнути git preflight

👉 Expected:
	•	execution працює
	•	rule не тригериться

⸻

Scenario 2 — Add Custom Loop
	•	Додати новий rule:
	•	evidence = artifact X
	•	action = retry

👉 Expected:
	•	loop реально запускається

⸻

Scenario 3 — Override Rule
	•	Змінити threshold (tokens)

👉 Expected:
	•	новий threshold застосовується

⸻

🧩 SECTION 8 — Gaps & Risks

⸻

Виявити:
	•	hardcoded rules
	•	rules без scope
	•	rules без disable
	•	evaluator lock-in
	•	UI відсутність управління

⸻

🧾 Output

Gaps:
- ...
Risks:
- ...


⸻

🧩 FINAL DECISION

⸻

Агент має відповісти:

## Pre-Sprint 24 Decision

Policy System State:
- FULLY MANAGED
- PARTIALLY MANAGED
- CONFIG-ONLY (not productized)

Critical Missing Pieces:
- ...

Ready for Sprint 24:
- YES / NO


⸻

💥 Ключовий сенс цього документу

Це перевіряє одну річ:

❗ чи система реально стала “no-code configurable AI orchestration system”

⸻

🚨 Якщо коротко

Якщо відповідь буде:
	•	“rules в YAML, UI нема, scope нема”

👉 це означає:

у вас декларативність тільки на папері

⸻
