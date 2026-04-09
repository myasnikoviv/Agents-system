🟪 Pre-Sprint 25 Gate — Production Architecture & SaaS Readiness Research

🎯 Goal

Провести повний технічний аудит системи після Sprint 24 і підготувати основу для переходу від локальної/single-tenant агентної системи до production-grade SaaS platform.

⸻

🧠 Research Objectives

1. Production Architecture Audit

Потрібно з’ясувати:
	•	чи архітектура відповідає принципам:
	•	SOLID
	•	separation of concerns
	•	bounded contexts
	•	extensibility
	•	observability
	•	fault tolerance
	•	чи немає:
	•	god objects
	•	надмірного coupling
	•	циклічних залежностей
	•	runtime logic, розмазаної по UI/backend/governance
	•	чи підтримувана система:
	•	для нових фіч
	•	для нових evaluator-ів
	•	для нових agent types
	•	для нових execution modes

⸻

2. Infrastructure Audit

Потрібно з’ясувати:
	•	які компоненти зараз є:
	•	API
	•	runtime router
	•	worker runtime
	•	queue
	•	Redis
	•	storage
	•	telemetry
	•	Cockpit UI
	•	як вони взаємодіють
	•	які з них:
	•	stateful
	•	stateless
	•	легко масштабуються
	•	не масштабуються
	•	які bottleneck-и є вже зараз:
	•	CPU
	•	RAM
	•	queue pressure
	•	Redis contention
	•	worker spawn overhead

⸻

3. SaaS Readiness

Потрібно з’ясувати:
	•	що заважає перетворити це на SaaS прямо зараз
	•	що треба доробити для:
	•	multi-tenancy
	•	tenant isolation
	•	hosted worker runtime
	•	managed storage
	•	billing / quotas
	•	cloud orchestration
	•	auth / RBAC
	•	secure secrets handling
	•	auditability
	•	deployment automation

⸻

4. Hosting Model Research

Потрібно порівняти 3 моделі:

A. Local / Self-hosted
	•	все працює на машині клієнта

B. Hybrid
	•	control plane у вас
	•	workers / execution частково локально або у dedicated runtime

C. Full SaaS
	•	усе у вашій хмарі:
	•	control plane
	•	workers
	•	telemetry
	•	project storage
	•	governance
	•	UI

Для кожної моделі потрібно оцінити:
	•	складність реалізації
	•	вартість
	•	security implications
	•	latency
	•	UX
	•	монетизацію
	•	support burden

⸻

5. Tenant & Project Isolation Model

Потрібно дослідити:
	•	як ізолювати:
	•	tenant
	•	workspace
	•	project
	•	agent
	•	run
	•	memory
	•	як організувати:
	•	namespaces
	•	storage partitioning
	•	queue partitioning
	•	worker allocation
	•	чи потрібні:
	•	dedicated workers per tenant
	•	shared worker pools
	•	tenant-level quotas
	•	project-level quotas

⸻

6. Cloud Runtime Model

Потрібно дослідити, де і як мають крутитися агенти в SaaS.

Варіанти для оцінки:
	•	shared worker pool
	•	tenant-scoped worker pool
	•	project-scoped ephemeral workers
	•	hot/cold worker model у хмарі
	•	containerized workers
	•	serverless workers
	•	long-lived supervisors + short-lived execution pods

Для кожного варіанту треба оцінити:
	•	startup latency
	•	memory pressure
	•	cost
	•	isolation
	•	debuggability
	•	autoscaling complexity

⸻

7. Data Layer & Persistence Research

Потрібно оцінити:
	•	чи Redis достатній як:
	•	queue
	•	memory
	•	blackboard
	•	ephemeral coordination layer
	•	що має піти в:
	•	Postgres / relational DB
	•	object storage
	•	analytics store
	•	long-term event store
	•	як зберігати:
	•	project configs
	•	policies
	•	telemetry
	•	governance logs
	•	artifacts
	•	run history
	•	audit logs

⸻

8. Security & Compliance Readiness

Потрібно дослідити:
	•	secrets management
	•	per-tenant auth boundaries
	•	credential isolation
	•	file/artifact access boundaries
	•	override / governance safety
	•	prompt / artifact privacy
	•	admin access model
	•	audit logging requirements
	•	risk of code execution / evaluator extension

⸻

9. Deployment & Operations Research

Потрібно оцінити:
	•	як це деплоїти:
	•	monolith?
	•	modular services?
	•	k8s?
	•	Nomad?
	•	Docker Compose only for dev?
	•	що потрібно для:
	•	staging
	•	production
	•	blue/green deploys
	•	rollback
	•	migrations
	•	incident recovery
	•	що потрібно для:
	•	health checks
	•	tracing
	•	alerting
	•	SLO/SLA

⸻

10. Productization Gaps

Потрібно окремо зафіксувати:
	•	що ще лишається “engineering-only”
	•	що ще треба зробити, щоб цим міг користуватися клієнт без вас
	•	які parts системи ще “config theater”, а не реальний продукт
	•	які parts треба винести в:
	•	admin UI
	•	tenant settings
	•	billing controls
	•	policy controls
	•	worker/runtime settings

⸻

🧩 Required Deliverables

Агент має повернути повний research package з наступних документів.

1. Architecture Audit Report

Повний аудит архітектури:
	•	current state
	•	strong areas
	•	weak areas
	•	technical debt
	•	coupling map
	•	SOLID / maintainability assessment

⸻

2. SaaS Readiness Report

Окремий документ:
	•	current blockers
	•	required transformations
	•	tenant model
	•	security model
	•	hosting model

⸻

3. Infrastructure Topology Diagram

Схема:
	•	current architecture
	•	target SaaS architecture

⸻

4. Service Decomposition Proposal

Які сервіси треба виділити:
	•	control plane
	•	runtime dispatcher
	•	worker manager
	•	queue service
	•	telemetry service
	•	policy service
	•	artifact service
	•	auth/billing/admin layers

⸻

5. Hosting Options Comparison Matrix

Таблиця:
	•	local
	•	hybrid
	•	SaaS

з оцінкою:
	•	cost
	•	complexity
	•	UX
	•	security
	•	scaling

⸻

6. Tenant Isolation Model

Опис:
	•	tenant
	•	workspace
	•	project
	•	agent
	•	run
	•	memory
	•	storage
	•	queue

⸻

7. Risk Register

Список ризиків:
	•	architecture risks
	•	infra risks
	•	SaaS risks
	•	scaling risks
	•	security risks

⸻

8. Recommended Roadmap

Що робити далі:
	•	Sprint 25
	•	Sprint 26
	•	Sprint 27
і так далі

з пріоритетами:
	•	must-have
	•	should-have
	•	later

⸻

🧪 Required Audit Questions

SECTION A — Architecture Quality
	•	Чи є у системі великі orchestration classes, які порушують SOLID?
	•	Чи є modules, що знають забагато про інші modules?
	•	Чи є точки, де runtime/business/policy/UI logic змішані?
	•	Чи є parts, які неможливо змінювати без cascade effects?
	•	Які components зараз найбільш небезпечні для масштабування команди?

⸻

SECTION B — SaaS Feasibility
	•	Що заважає розгорнути це як multi-tenant SaaS сьогодні?
	•	Які компоненти треба відокремити в першу чергу?
	•	Чи можна зробити shared runtime safely?
	•	Чи потрібна tenant-dedicated execution plane?
	•	Де повинні жити агенти в SaaS-моделі?

⸻

SECTION C — Infrastructure
	•	Які сервіси повинні бути stateless?
	•	Які мають бути stateful?
	•	Що залишається в Redis?
	•	Що треба винести в БД?
	•	Що треба винести в object storage?
	•	Які частини системи повинні автоскейлитись?
	•	Які частини не можна автоскейлити без redesign?

⸻

SECTION D — Security
	•	Чи достатньо зараз ізоляції для multi-tenant?
	•	Як зберігати credentials клієнтів?
	•	Як забезпечити isolation артефактів і prompt logs?
	•	Які ризики несе evaluator/plugin model?
	•	Які частини системи зараз небезпечні для white-label / SaaS?

⸻

SECTION E — Operations
	•	Як це моніторити в проді?
	•	Які метрики повинні бути SLO-level?
	•	Як робити rollout нової версії runtime?
	•	Як робити rollback?
	•	Як дебажити tenant-specific incidents?

⸻

🧾 Required Output Format

## Pre-Sprint 25 Gate Report

### 1. Executive Summary
- Production Architecture State: ...
- SaaS Readiness State: ...
- Recommendation: ...

### 2. Architecture Audit
...

### 3. Infrastructure Audit
...

### 4. SaaS Readiness
...

### 5. Top Risks
...

### 6. Recommended Target Architecture
...

### 7. Roadmap Proposal
...


⸻

🧠 Decision Gate

Фінально агент має відповісти на 3 питання:
	1.	Чи є поточна система production-grade як single-tenant/self-hosted platform?
	2.	Чи готова вона до SaaS без серйозного redesign?
	3.	Які 5 найкритичніших змін потрібні для переходу до SaaS?

⸻

Моя рекомендація

Оформити це саме як Pre-Sprint 25 Gate, а не одразу як Sprint 25, бо ви ще не знаєте:
	•	чи потрібен один спринт,
	•	чи треба окремо:
	•	architecture remediation,
	•	SaaS platformization,
	•	security hardening,
	•	infra decomposition.
