🟪 Sprint 26 — Cloud-Ready Multi-User Runtime & On-Demand Environment Provisioning

🎯 Goal

Побудувати архітектурну основу, в якій система:
	•	працює локально для одного користувача
	•	але може бути розгорнута як cloud-hosted multi-user platform
	•	і для кожного користувача / tenant / workspace може on-demand піднімати ізольоване runtime-середовище

⸻

🧠 Core Idea

Після Sprint 25 система стає:
	•	SaaS-capable на рівні архітектури,
	•	але ще не має повного user-scoped execution model.

Sprint 26 має зробити так, щоб:

користувач = не просто запис у БД,
а окрема операційна одиниця платформи

з:
	•	auth identity
	•	workspace/tenant boundary
	•	isolated runtime
	•	own agents / queues / memory / artifacts
	•	on-demand lifecycle

⸻

❗ Problem Statement

Зараз навіть якщо архітектура вже буде розкладена на сервіси, цього недостатньо для масштабованого продукту, бо ще немає:
	•	user-scoped runtime provisioning
	•	on-demand worker environment startup
	•	environment lifecycle per user/workspace
	•	autoscaling model
	•	user-aware routing and orchestration

Якщо цього не зробити, то при тисячах юзерів система впирається в bottleneck:
	•	shared runtime pressure
	•	unbounded worker growth
	•	tenant interference
	•	weak isolation
	•	непередбачуваний cost profile

⸻

🧩 Sprint 26 має вирішити

1. User / Tenant Execution Model

Визначити і реалізувати:
	•	user
	•	tenant
	•	workspace
	•	project
	•	runtime environment
	•	worker pool

та їх зв’язок.

⸻

2. Authentication Foundation

Додати production-oriented auth layer, щоб:
	•	user identity була реальною
	•	всі runtime/action/policy/entity operations були прив’язані до user/tenant/workspace

⸻

3. On-Demand Runtime Provisioning

Коли користувач заходить або активує workspace/project:
	•	середовище НЕ обов’язково постійно працює
	•	система може:
	•	підняти environment
	•	прогріти hot workers
	•	підключити queue/memory/artifacts
	•	віддати статус “environment starting”

⸻

4. User-Scoped Agent Runtime

Агенти мають працювати:
	•	не глобально,
	•	а в рамках конкретного user/tenant/workspace environment.

⸻

5. Hot / Cold Runtime Strategy

Для конкретного user/workspace:
	•	частина агентів hot
	•	частина cold
	•	підняття on-demand
	•	eviction / suspend / teardown policy

⸻

6. Cloud Execution Abstraction

Система має вміти запускатися:
	•	локально
	•	в Docker
	•	у cloud runtime
	•	у container-based orchestrator

без переписування ядра.

⸻

7. Environment Lifecycle

Повинна існувати модель:
	•	provisioning
	•	warming
	•	active
	•	idle
	•	suspended
	•	terminated
	•	failed

для user-scoped environments.

⸻

8. Scalable Runtime Topology

Потрібно закласти архітектуру, де:
	•	control plane окремо
	•	execution plane окремо
	•	user environments можуть підніматись/опускатись on demand

⸻

🧱 Scope

✔️ Входить
	•	user/tenant/workspace runtime model
	•	auth foundation
	•	environment provisioning model
	•	user-scoped worker orchestration
	•	environment lifecycle states
	•	hot/cold runtime strategy
	•	cloud/self-host portability
	•	deployment abstraction for user environments

❌ Не входить
	•	billing / subscriptions
	•	enterprise org management
	•	advanced autoscaling heuristics
	•	full marketplace / onboarding UX
	•	compliance certification

⸻

🧠 Key Principles

1. One Platform, Two Modes

Система повинна працювати:
	•	локально для одного користувача
	•	у cloud для багатьох користувачів

без різної бізнес-логіки.

⸻

2. User-Scoped Runtime

Кожен користувач/tenant/workspace має власну execution boundary.

⸻

3. On-Demand by Default

Не тримати всі runtime-и і всіх агентів постійно піднятими.

⸻

4. Isolation Before Scale

Спочатку:
	•	правильна ізоляція
	•	правильні boundaries

потім:
	•	autoscaling

⸻

5. Portable Runtime

Те саме ядро має запускатися:
	•	на ноуті
	•	у Docker
	•	у k8s / cloud container runtime

⸻

🧪 Success Criteria

Спринт успішний, якщо:

✅ Auth існує
	•	можна завести окремого користувача
	•	усі ключові дії прив’язані до user/tenant/workspace

✅ User environments існують
	•	середовище створюється під user/workspace
	•	має lifecycle

✅ Runtime on-demand
	•	environment не мусить бути постійно активним
	•	може стартувати при вході / активації

✅ Isolation реальна
	•	workers / queues / memory / policies / artifacts ізольовані

✅ Hot/cold strategy існує
	•	не всі агенти підняті постійно
	•	hot/cold керуються в рамках user environment

✅ Local + Cloud parity
	•	система працює локально
	•	і той самий runtime може бути розгорнутий у cloud

⸻

📊 Expected Outcome

Після Sprint 26 система стане:
	•	self-hostable для тебе
	•	cloud-portable
	•	multi-user ready
	•	on-demand scalable
	•	готовою до monetization later без redesign

⸻

🚀 Strategic Value

Це той спринт, який переводить систему з:

“дуже потужний інженерний інструмент”

в:

“platform-ready execution product”

⸻

Ключовий architectural shift

До Sprint 26:
	•	система мислить про:
	•	project
	•	agent
	•	run

Після Sprint 26:
	•	система мислить про:
	•	user
	•	tenant
	•	workspace
	•	environment
	•	project
	•	agent
	•	run

⸻

Практичний сенс для тебе

Після цього ти зможеш:
	•	запускати все локально для себе
	•	але знати, що це ж саме ядро:
	•	можна загорнути в cloud
	•	можна підняти для іншого юзера
	•	можна дати доступ по auth
	•	можна далі прикрутити billing

без фундаментального переписування системи.

⸻
