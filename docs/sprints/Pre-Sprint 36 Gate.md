🟪 Pre-Sprint 36 Gate — Product Layer Boundaries & Organizational Model

🧾 Meta
	•	Gate ID: PRE-36
	•	Name: Product Layer Boundaries & Organizational Model
	•	Status: Ready for research
	•	Purpose: визначити, що саме має стати частиною core domain, а що має бути product facade / UX abstraction
	•	Decision target: підготувати розділення на:
	1.	Core Organizational Domain Sprint
	2.	Product Layer / Wizard UX Sprint

⸻

1. Executive Purpose

Платформа вже має потужний infrastructure layer:
	•	agents
	•	pipelines
	•	skills
	•	loops
	•	governance
	•	runtime
	•	memory
	•	control plane
	•	asset governance

Але для продуктового рівня цього недостатньо.
Користувач мислить не технічними сутностями, а категоріями:
	•	team
	•	role
	•	department
	•	mission
	•	progress
	•	approvals
	•	results

Тому перед запуском Product Layer потрібно визначити:
	•	які organizational entities мають бути first-class entities у core,
	•	які memory scopes вони створюють,
	•	як вони зв’язуються з agents / pipelines / governance,
	•	що лишається лише UX abstraction,
	•	як не зламати чесність моделі.

⸻

2. Strategic Context

Платформа рухається від:

AI engine / orchestration system

до:

AI workforce product / agent operating system

Це не означає переписування ядра.
Але це означає, що частина нових сутностей вже не може бути лише фронтенд-обгорткою.

Ключовий сигнал:

якщо team / mission / department створюють нові memory contracts, access scopes, approval points і runtime bindings — це вже core domain, а не просто UI.

⸻

3. Main Decision Question

Що є:
	•	core organizational domain

а що є:
	•	product facade / presentation layer?

⸻

4. Candidate New Organizational Entities

Потрібно перевірити, чи ці сутності мають стати first-class entities системи:
	•	Team
	•	Role
	•	Department
	•	Mission
	•	Workforce Template
	•	Team Template
	•	Role Template
	•	Department Binding
	•	Approval Point
	•	Shared Team Resource
	•	Mission Artifact Bundle

⸻

5. Core vs Facade Boundary Areas

⸻

5.1 Teams

Hypothesis

Team — це не просто UI-група агентів, а окрема domain entity.

Why it may belong to core
	•	team має composition
	•	team має own working context
	•	team має own memory scope
	•	team виконує missions
	•	team має internal/shared resources

Questions
	1.	Чи Team має бути first-class entity у DB/registry?
	2.	Чи Team лише grouping for UI, чи runtime-relevant structure?
	3.	Чи team ownership/scopes впливають на retrieval/memory/governance?
	4.	Чи team assets мають реєструватися окремо?

Required output
	•	decision: core entity vs facade grouping
	•	minimal Team schema
	•	runtime significance assessment

⸻

5.2 Roles

Hypothesis

Role — це organizational abstraction поверх agents/templates, але може бути також core entity.

Questions
	1.	Чи Role = alias for agent template, чи окрема domain сутність?
	2.	Чи один role може мапитися на різні agents/templates у різних workspaces?
	3.	Чи role має own metadata:
	•	responsibility
	•	expected outputs
	•	approvals
	•	allowed tools
	4.	Чи role binding має впливати на runtime?

Required output
	•	role model decision
	•	role ↔ agent/template mapping rules

⸻

5.3 Departments

Hypothesis

Department — це organizational grouping above teams.

Questions
	1.	Чи Department створює окремий memory scope?
	2.	Чи Department потрібен у core зараз, чи можна лишити metadata-level abstraction?
	3.	Чи Department має own policies / approvals / templates?
	4.	Чи Department має бути окремою registry entity?

Required output
	•	department necessity decision
	•	scope/no-scope decision
	•	ownership model

⸻

5.4 Missions

Hypothesis

Mission — це точно більше, ніж просто chat/task label.

Why it likely belongs to core
	•	mission має own execution lifecycle
	•	mission produces artifacts
	•	mission може мати approvals
	•	mission може мати team-owned context
	•	mission може мати budget, deadlines, progress

Questions
	1.	Чи Mission = first-class runtime entity?
	2.	Чи Mission окрема від project/chat/task?
	3.	Чи Mission створює own memory scope?
	4.	Чи Mission має бути основною business-level одиницею execution?
	5.	Чи Mission має бути primary abstraction у Product Layer?

Required output
	•	mission model proposal
	•	mission ↔ project ↔ task/chat relations
	•	lifecycle model

⸻

6. Organizational Memory Model

Оце один із найважливіших блоків.

Зараз уже є:
	•	workspace shared memory
	•	project memory
	•	task/chat memory
	•	agent memory
	•	shared semantic memory

Треба з’ясувати, чи додаються нові логічні scopes:
	•	team memory
	•	mission memory
	•	department memory

Questions
	1.	Чи team memory є окремим scope, чи це retrieval layer над existing memory?
	2.	Чи mission memory є окремим working set для execution?
	3.	Чи department memory потрібна відразу, чи це future concern?
	4.	Як працює promotion:
	•	team/mission → project shared
	•	project → workspace shared?
	5.	Які memory scopes мають fast-path retrieval для agents?
	6.	Чи нові scopes потребують фізично окремого storage, чи лише logical tagging/indexing?

Required output
	•	organizational memory scope model
	•	logical vs physical separation decision
	•	promotion rules

⸻

7. Shared Resources Model

User already reasons in terms of:
	•	team chat
	•	team folder
	•	shared drive
	•	internal team docs
	•	approved outputs to shared knowledge base

Questions
	1.	Чи platform має моделювати team-owned shared resources як first-class entities?
	2.	Чи team resources merely links to external systems, чи internal managed artifacts?
	3.	Чи mission/team resources мають окремий access model?
	4.	Як відбувається promotion з internal team working set у shared project knowledge?

Required output
	•	shared resource model
	•	working set vs promoted artifact model

⸻

8. Core Runtime Bindings

Product Layer не може брехати.
Тому треба визначити, які bindings справді потрібні в core.

Candidate bindings
	•	team → roles
	•	role → agent/template
	•	mission → team
	•	mission → pipelines
	•	mission → approvals
	•	department → teams
	•	team → memory scope
	•	mission → artifact bundle

Questions
	1.	Які зв’язки мають бути persistable і enforceable?
	2.	Які зв’язки можуть лишитися purely presentational?
	3.	Чи team/mission bindings впливають на routing/governance/retrieval?
	4.	Які bindings мають входити в asset registry model?

Required output
	•	organizational binding map
	•	core vs facade relation matrix

⸻

9. Product Language vs Engine Language

Потрібно зафіксувати product vocabulary.

Infrastructure language
	•	agent
	•	pipeline
	•	skill
	•	loop
	•	governance
	•	MCP
	•	execution target

Product language
	•	team
	•	role
	•	mission
	•	department
	•	knowledge source
	•	approval
	•	result
	•	progress

Questions
	1.	Які технічні сутності мають бути приховані в normal UX?
	2.	Які з них мають зберігатися тільки в advanced mode?
	3.	Які product terms стають canonical UI vocabulary?
	4.	Чи “agent library” треба повністю сховати за team/role/workforce abstractions?

Required output
	•	vocabulary mapping
	•	simple/guided/advanced layer definitions

⸻

10. Wizard & Product Facade

Є ідея побудувати high-level onboarding:
	•	user описує ціль
	•	система пропонує команду
	•	підбирає roles
	•	підбирає knowledge
	•	підключає integrations
	•	пропонує approvals
	•	генерує project setup

Questions
	1.	Що wizard має створювати насправді:
	•	project,
	•	team,
	•	missions,
	•	templates,
	•	governance profiles,
	•	knowledge bindings?
	2.	Які рішення wizard має приймати автоматично?
	3.	Які дані wizard повинен запитати у user?
	4.	Чи wizard має опиратися на template catalog?
	5.	Як не допустити, щоб wizard створював entities, яких ядро не розуміє?

Required output
	•	wizard responsibility map
	•	wizard → core entity creation map

⸻

11. Template Catalog for Product Layer

Майбутня product layer надбудова потребує каталогу типу:
	•	Marketing Team
	•	Product Launch Team
	•	App Development Team
	•	Founder Office
	•	Research Team

Але під капотом це має бути structured template system.

Questions
	1.	Які catalog entries є product-level templates?
	2.	Як вони мапляться на:
	•	teams
	•	roles
	•	pipelines
	•	governance profiles
	•	knowledge defaults?
	3.	Які metadata вже зараз треба додати в registry/template library?
	4.	Чи catalog entries мають versioning і lineage так само, як technical templates?

Required output
	•	product-template catalog model
	•	mapping to core declarative assets

⸻

12. Approval & Progress Model at Product Layer

Product layer має показувати не технічні loops, а:
	•	progress
	•	waiting for approval
	•	blocked
	•	in review
	•	completed

Questions
	1.	Як product-level progress мапиться на runtime/governance state?
	2.	Які approval points мають бути first-class product entities?
	3.	Чи Mission має own approval graph?
	4.	Як показувати blocked state без exposing technical internals?

Required output
	•	progress abstraction model
	•	approval abstraction model

⸻

13. Data Model Extension Questions

Потрібно вирішити, чи додавати в core DB/registry наступні сутності:
	•	teams
	•	team_memberships
	•	roles
	•	departments
	•	missions
	•	mission_artifacts
	•	team_memory_bindings
	•	role_template_bindings
	•	team_template_instances

Questions
	1.	Які з цих сутностей точно потрібні в core already now?
	2.	Які можна відкласти до facade-only phase?
	3.	Які поля треба передбачити вже зараз, щоб не робити painful migrations пізніше?

Required output
	•	proposed schema delta
	•	must-have vs later matrix

⸻

14. Access & Visibility Model

Team/mission/department introduce new visibility tiers.

Questions
	1.	Хто бачить team working set?
	2.	Хто бачить mission drafts?
	3.	Коли internal team outputs стають shared project knowledge?
	4.	Чи CEO/founder role має доступ до team internal context automatically?
	5.	Як це співвідноситься з tenant/workspace/project isolation?

Required output
	•	visibility matrix
	•	promotion/access policy

⸻

15. Risks If Built Wrong

Risk A — Fake Product Layer

UI обіцяє teams/departments, але backend знає тільки agents.

Risk B — Overbuilding Core

У ядро заносять сутності, які поки що не дають системної користі.

Risk C — Memory Chaos

Нові “командні” сутності створюють незрозумілу й дорогу систему scopes.

Risk D — Dishonest UX

Product metaphor не відповідає реальному runtime behavior.

Risk E — Wizard Creates Invalid Worlds

Wizard створює структуру, яку governance/runtime не вміють обслуговувати.

⸻

16. Gate Deliverables Required

Команда/агент, що проходить gate, має повернути:

16.1 Organizational Domain Proposal
	•	Team / Role / Department / Mission model
	•	які з них core entities

16.2 Memory Scope Proposal
	•	чи є team/mission/department memory scopes
	•	logical vs physical implementation

16.3 Core vs Facade Boundary Matrix
	•	що йде в ядро
	•	що йде в product layer

16.4 Wizard Feasibility Note
	•	що wizard реально створює
	•	що лишається advanced mode

16.5 Product Vocabulary Proposal
	•	canonical terms for normal UX
	•	mapping to technical entities

16.6 Template Catalog Compatibility Model
	•	як product templates мапляться на technical templates

16.7 Risk Register
	•	що зламається, якщо зробити все тільки фронтендом
	•	що зламається, якщо все звалити в core

⸻

17. Required Output Format

## Pre-Sprint 36 Gate Report

### 1. Executive Summary
- Is Product Layer mostly facade, mostly core extension, or hybrid?
- Main recommendation:
- Biggest risks:

### 2. Organizational Domain Model
...

### 3. Memory Scope Model
...

### 4. Core vs Facade Boundaries
...

### 5. Wizard Feasibility
...

### 6. Product Vocabulary
...

### 7. Template Catalog Mapping
...

### 8. Access & Visibility Model
...

### 9. Risks & Edge Cases
...

### 10. Recommended Split
- Sprint 36A:
- Sprint 36B:


⸻

18. Decision Gate

Фінально потрібно дати відповіді на 5 питань:
	1.	Чи Teams / Roles / Missions — це лише UX abstraction, чи новий domain layer?
	2.	Які organizational entities треба додати в core now, а які можна лишити facade-only?
	3.	Чи team/mission створюють нові memory scopes, чи достатньо logical tagging over existing memory?
	4.	Що wizard має реально створювати в системі?
	5.	Який мінімальний core extension потрібен, щоб Product Layer був чесним і масштабованим?

⸻

19. Expected Next Step

Після цього gate логічно розбити далі на два спринти:

Sprint 36A — Organizational Core Extension
	•	teams
	•	roles
	•	missions
	•	bindings
	•	memory scopes
	•	access model
	•	registry/schema updates

Sprint 36B — Product Layer / Wizard UX
	•	product language
	•	wizard
	•	team templates
	•	guided mode
	•	simple mode
	•	progress views
	•	advanced mode boundary

⸻

20. Final Note

❗ Якщо зробити Product Layer лише як фронтенд-метафору, він буде брехати.
❗ Якщо занести все в ядро без перевірки, система стане важкою і перенавантаженою.

Тому зараз правильний крок — саме цей gate.

⸻