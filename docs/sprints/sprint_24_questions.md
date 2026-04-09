Супер. Нижче даю жорсткий Validation Pack для Sprint 24, щоб перевірити не “чи з’явився UI”, а:

❗ чи policy / loop system реально став керованим продуктом, а не залишився “YAML + код” під капотом.

Опираюсь на ваш pre-sprint 24 gate report.  ￼

⸻

🟪 Sprint 24 — FINAL VALIDATION PACK (Policy Management & Loop System)

🎯 Ціль перевірки

Підтвердити, що після Sprint 24 система:
	•	дозволяє керувати rules / loops як продуктом;
	•	підтримує:
	•	catalog
	•	lifecycle
	•	scope
	•	project overrides
	•	UI/API management;
	•	не вимагає правки YAML/коду для типових операцій.

⸻

🧩 SECTION 1 — Rule Catalog API

1.1 Full Rule List
	•	Чи існує API для отримання повного каталогу rules?
	•	Чи повертає він всі rules, а не тільки overrides?
	•	Чи в каталозі видно:
	•	id
	•	name
	•	description
	•	trigger
	•	evaluator
	•	enforcement
	•	enabledByDefault
	•	scope info

1.2 Single Rule Read
	•	Чи існує API для отримання одного rule по id?
	•	Чи відповідь повна і придатна для UI editor?

1.3 Catalog Truthfulness
	•	Чи API бере дані з реального registry/storage?
	•	Чи це не окремий mock/view-model шар?

⸻

🧩 SECTION 2 — Rule Metadata Model

2.1 Metadata Presence
	•	Чи в кожного rule є:
	•	name
	•	description
	•	version
	•	owner
	•	tags
	•	createdAt
	•	updatedAt

2.2 Metadata Persistence
	•	Чи metadata реально зберігається?
	•	Чи survive-ить reload/restart?

2.3 Metadata in UI
	•	Чи Cockpit показує metadata, а не тільки technical id?

⸻

🧩 SECTION 3 — Rule Lifecycle Management

3.1 Create Rule
	•	Чи можна створити новий rule без правки YAML руками?
	•	Чи create працює через API?
	•	Чи новий rule після створення:
	•	з’являється в catalog
	•	доступний у UI
	•	може бути прив’язаний до project

3.2 Update Rule
	•	Чи можна змінити:
	•	trigger
	•	evidence
	•	threshold
	•	enforcement
	•	Чи update реально змінює runtime behavior?

3.3 Disable Rule
	•	Чи можна вимкнути rule?
	•	Чи disable відображається в UI і API?
	•	Чи вимкнений rule реально перестає спрацьовувати?

3.4 Delete Rule
	•	Якщо delete входить у scope — чи він працює без залишкових посилань?
	•	Якщо delete не входить — чи це явно задокументовано?

⸻

🧩 SECTION 4 — Scope Model

4.1 Scope Levels
	•	Чи підтримуються scope levels:
	•	global
	•	project
	•	session/task

4.2 Explicit Precedence
	•	Чи precedence формально визначена?
	•	Чи працює правило:
	•	session > project > global

4.3 Scope Resolution
	•	Чи є deterministic resolution engine?
	•	Чи при конфлікті двох правил outcome передбачуваний?

4.4 Project Isolation
	•	Чи один і той самий rule може бути:
	•	enabled в одному project
	•	disabled в іншому
	•	Чи це перевірено сценарієм, а не тільки кодом?

⸻

🧩 SECTION 5 — Project Policy Management

5.1 Project Policy API
	•	Чи є API для читання project policy?
	•	Чи є API для оновлення project policy?

5.2 Per-project Enable/Disable
	•	Чи можна увімкнути/вимкнути rule на рівні project?
	•	Чи це не ламає global defaults?

5.3 Per-project Overrides
	•	Чи можна override:
	•	threshold
	•	evidence path
	•	enforcement mode
	•	Чи override реально впливає на execution саме цього project?

5.4 Real Use Case
	•	Чи можна для “marketing project without git” вимкнути git_preflight?
	•	Чи після цього execution реально проходить без preflight block?

⸻

🧩 SECTION 6 — Cockpit UI for Rules & Loops

6.1 Rule List UI
	•	Чи UI показує повний список rules?
	•	Чи видно:
	•	status
	•	scope
	•	metadata
	•	evaluator type

6.2 Rule Detail UI
	•	Чи можна відкрити один rule і побачити його повну конфігурацію?

6.3 Rule Toggle UI
	•	Чи enable/disable працює з UI?
	•	Чи зміна з UI реально доходить до backend?

6.4 Project Policy UI
	•	Чи видно, які rules активні для конкретного project?
	•	Чи можна їх змінювати з UI?

6.5 No Fake UI
	•	Чи UI не “показує перемикач”, який нічого не змінює в runtime?

⸻

🧩 SECTION 7 — Rule Editor UI/API

7.1 Rule Editing
	•	Чи можна редагувати rule через UI?
	•	Чи зміни видно після reload?

7.2 Validation
	•	Чи є schema validation при save?
	•	Чи UI показує зрозумілі помилки?

7.3 Safe Update
	•	Чи некоректний update не ламає catalog/runtime?

7.4 Runtime Effect
	•	Чи оновлений rule реально застосовується без ручного втручання в код?

⸻

🧩 SECTION 8 — Evaluator Extensibility

8.1 Evaluator Contract
	•	Чи є формальний evaluator interface/contract?
	•	Чи evaluator registry видимий і зрозумілий?

8.2 Safe Expansion
	•	Чи можна додати новий evaluator type контрольовано?
	•	Чи це не arbitrary code execution?

8.3 Declarative Binding
	•	Чи rule прив’язується до evaluator декларативно?
	•	Чи binding не розмазаний по коду?

8.4 Limits of No-code
	•	Чи чітко визначено:
	•	що user може зробити без коду
	•	а що все ще вимагає engineering support

⸻

🧩 SECTION 9 — Loop Model Productization

9.1 Loop Visibility
	•	Чи loops відображаються як first-class entities, а не просто як “ще один rule”?

9.2 Loop Create / Update / Disable
	•	Чи можна створити новий loop без коду, якщо він базується на існуючих evaluators?
	•	Чи можна змінити evidence / trigger / enforcement для loop?

9.3 Loop Scoping
	•	Чи loop може бути:
	•	глобальним
	•	project-scoped
	•	session/task-scoped

9.4 Manual Trigger
	•	Чи manual force loop працює з UI/API?
	•	Чи видно результат loop execution?

⸻

🧩 SECTION 10 — Real Use-case Scenarios

10.1 Scenario: Marketing Project Without Git

Перевірити:
	•	створення/налаштування project policy;
	•	вимкнення git preflight;
	•	успішний run без git evidence.

Очікування:
	•	rule не тригериться;
	•	project execution не блокується.

10.2 Scenario: Add New Rule Using Existing Evaluator

Перевірити:
	•	створити rule через API/UI;
	•	використовувати існуючий evaluator;
	•	увімкнути правило в project.

Очікування:
	•	rule реально з’являється;
	•	rule реально спрацьовує.

10.3 Scenario: Override Threshold

Перевірити:
	•	змінити threshold для одного project;
	•	перевірити, що інший project не змінився.

Очікування:
	•	override project-scoped;
	•	runtime behavior відрізняється між projects.

10.4 Scenario: Disable System Rule for One Project

Перевірити:
	•	system rule active globally;
	•	disabled in one project.

Очікування:
	•	один project проходить;
	•	інший блокується.

⸻

🧩 SECTION 11 — Auditability & Traceability

11.1 Change Audit
	•	Чи create/update/disable rule логуються?
	•	Чи видно:
	•	хто змінив
	•	коли
	•	що саме

11.2 Versioning
	•	Чи rule version змінюється при update?
	•	Чи видно історію змін?

11.3 Scope Audit
	•	Чи можна відстежити, чому для project активний саме такий набір правил?

⸻

🧩 SECTION 12 — Final Reality Check

❗ Питання 1
	•	Чи система після Sprint 24 реально стала керованою policy platform, а не “YAML-конфігом з UI зверху”?

❗ Питання 2
	•	Чи non-engineering user може:
	•	знайти правило
	•	зрозуміти його
	•	вимкнути / змінити його для project
без зміни коду?

❗ Питання 3
	•	Чи governance/loops тепер productized, а не лише technically present?

❗ Питання 4
	•	Чи залишилися ще критичні залежності від ручного редагування config/code?

⸻

🧾 REQUIRED OUTPUT FORMAT

Агент має повернути:

## Sprint 24 Validation Report

Overall: READY / PARTIAL / NOT READY

### Rule Catalog API
...

### Rule Lifecycle
...

### Scope & Project Policy
...

### Cockpit UI
...

### Evaluator Extensibility
...

### Real Use-case Validation
...

### Critical Gaps
...

### Recommendation
...


⸻

💥 Ключовий критерій Sprint 24

Sprint 24 завершений тільки якщо:
	•	rules видно;
	•	rules можна змінювати;
	•	rules можна скопити;
	•	project policies реально працюють;
	•	loops керовані без коду;
	•	Cockpit перестає бути лише viewer і стає policy control surface.

⸻

Найважливіше

Цей validation pack перевіряє одну річ:

❗ чи став governance layer продуктом, а не просто набором конфігів
