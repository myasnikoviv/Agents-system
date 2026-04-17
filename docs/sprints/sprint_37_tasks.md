🟪 Sprint 37 — Architecture Refactor & Repository Topology Foundation

📦 EPIC + TASK Breakdown

⸻

🧩 EPIC 37.1 — Repository Topology Refactor

🎯 Goal

Перетворити поточний repo у multi-package monorepo, де фізична структура відображає реальну архітектуру.

⸻

🎫 [x] AGSYS-3701 — Define target repository topology

Description
Зафіксувати цільову структуру repo.

Target

apps/
  client-app
  control-plane

packages/
  runtime
  governance
  billing
  memory
  shared

Acceptance Criteria
	•	є затверджена цільова topology схема
	•	описано призначення кожної top-level зони
	•	визначено migration path з поточної структури

⸻

🎫 [x] AGSYS-3702 — Introduce monorepo workspace structure

Description
Ініціалізувати workspace-based структуру repo.

Acceptance Criteria
	•	apps/ створено
	•	packages/ створено
	•	workspace tooling підключене
	•	root scripts оновлені під нову topology

⸻

🎫 [x] AGSYS-3703 — Move frontend into app boundary

Description
Перенести поточний frontend у apps/client-app.

Acceptance Criteria
	•	frontend більше не живе як окремий root blob
	•	build запускається з нового app location
	•	routing і dev mode не зламані

⸻

⸻

🧩 EPIC 37.2 — Backend Monolith Decomposition

🎯 Goal

Розбити фізичний backend-моноліт на domain-aligned модулі без зміни behavior.

⸻

🎫 [x] AGSYS-3704 — Decompose agentSystemBackend entrypoint

Description
Розбити agentSystemBackend.ts на менші доменні entry modules.

Target split
	•	API layer
	•	runtime adapter
	•	governance adapter
	•	billing adapter
	•	memory adapter

Acceptance Criteria
	•	agentSystemBackend.ts більше не god-object
	•	кожен домен має окремий модуль входу
	•	behavior parity збережена

⸻

🎫 [x] AGSYS-3705 — Extract route modules by domain

Description
Рознести маршрути по доменах.

Acceptance Criteria
	•	runtime routes окремо
	•	governance routes окремо
	•	billing routes окремо
	•	memory/system routes окремо
	•	route composition централізована, але не змішана

⸻

🎫 [x] AGSYS-3706 — Extract service adapters from API handlers

Description
Прибрати пряме змішування handler → runtime internals.

Acceptance Criteria
	•	API handlers не містять бізнес-логіку
	•	handlers звертаються до service/domain adapter layer
	•	зменшено coupling між server і runtime

⸻

⸻

🧩 EPIC 37.3 — Domain Package Extraction

🎯 Goal

Винести ключові домени в окремі пакети всередині monorepo.

⸻

🎫 [x] AGSYS-3707 — Extract runtime package

Description
Винести execution/runtime logic у packages/runtime.

Acceptance Criteria
	•	runtime код живе в окремому package
	•	package має власний public surface
	•	сервер не імпортує runtime через хаотичні deep imports

⸻

🎫 [x] AGSYS-3708 — Extract governance package

Description
Винести governance/loops/rules logic у packages/governance.

Acceptance Criteria
	•	governance код ізольовано
	•	validation / rules / profiles не перемішані з API code
	•	є чіткий import boundary

⸻

🎫 [x] AGSYS-3709 — Extract billing package

Description
Винести usage/quota/cost domain у packages/billing.

Acceptance Criteria
	•	billing домен живе окремо
	•	quota/cost logic не змішана з runtime/API шарами
	•	можна використовувати пакет незалежно

⸻

🎫 [x] AGSYS-3710 — Extract memory package

Description
Винести memory/storage abstraction у packages/memory.

Acceptance Criteria
	•	memory access централізовано
	•	memory contracts не розкидані по runtime/server
	•	package має чіткий API

⸻

🎫 [x] AGSYS-3711 — Create shared package

Description
Створити packages/shared для загальних контрактів.

Acceptance Criteria
	•	shared types винесені
	•	shared utils винесені
	•	shared contracts винесені
	•	немає хаотичних крос-доменних копій типів

⸻

⸻

🧩 EPIC 37.4 — Dependency Boundaries & Contracts

🎯 Goal

Позбутися spaghetti imports і зафіксувати domain boundaries.

⸻

🎫 [x] AGSYS-3712 — Define package import rules

Description
Визначити дозволені імпортні напрямки між пакетами.

Acceptance Criteria
	•	існує dependency policy
	•	описано allowed import graph
	•	заборонені циклічні domain dependencies

⸻

🎫 [x] AGSYS-3713 — Replace deep relative imports with package contracts

Description
Замінити нестабільні deep imports на package-level imports.

Acceptance Criteria
	•	немає критичних ../../../../
	•	домени імпортуються через публічний contract
	•	import graph спрощений

⸻

🎫 [x] AGSYS-3714 — Detect and remove circular dependencies

Description
Знайти та прибрати циклічні залежності між доменами.

Acceptance Criteria
	•	dependency graph перевірений
	•	cycle-free у ключових доменах
	•	documented if any temporary exceptions remain

⸻

⸻

🧩 EPIC 37.5 — Build & Docker Isolation

🎯 Goal

Прибрати full-repo builds і зробити selective build/deploy основу.

⸻

🎫 AGSYS-3715 — Redesign Docker build contexts

Description
Прибрати COPY . . як базовий підхід для всіх контейнерів.

Acceptance Criteria
	•	кожен Dockerfile має мінімальний build context
	•	більше не копіюється весь repo без потреби
	•	збірка ізольована по app/package boundaries

⸻

🎫 AGSYS-3716 — Create app-specific Dockerfiles

Description
Підготувати окремі Docker build flows для:
	•	client-app
	•	control-plane
	•	runtime-engine

Acceptance Criteria
	•	Dockerfile для кожного deploy unit
	•	build targets розділені
	•	dev/prod steps зрозумілі

⸻

🎫 AGSYS-3717 — Optimize image size and build time

Description
Зменшити вагу образів і прискорити збірку.

Acceptance Criteria
	•	multi-stage builds де доречно
	•	.dockerignore адекватний
	•	build time зменшено
	•	image size reduced materially

⸻

⸻

🧩 EPIC 37.6 — Data Ownership & Storage Boundaries

🎯 Goal

Формалізувати, який домен володіє якими даними.

⸻

🎫 AGSYS-3718 — Define domain data ownership map

Description
Описати ownership по даних:
	•	runtime
	•	governance
	•	billing
	•	memory
	•	control plane

Acceptance Criteria
	•	існує ownership matrix
	•	немає “shared uncontrolled” зон як policy
	•	зрозуміло, хто читає/пише що

⸻

🎫 AGSYS-3719 — Isolate blob storage from SQL text fields

Description
Підготувати migration away from base64/blob-in-SQL pattern.

Acceptance Criteria
	•	blob storage strategy визначена
	•	SQL лишається для metadata
	•	є migration plan / partial implementation foundation

⸻

🎫 AGSYS-3720 — Introduce storage gateway abstractions

Description
Додати storage access layer замість хаотичного доступу до DB/files.

Acceptance Criteria
	•	доступ до storage проходить через defined interfaces
	•	домени не лазять напряму куди попало
	•	behavior не змінено

⸻

⸻

🧩 EPIC 37.7 — Deploy Unit Preparation

🎯 Goal

Підготувати окремі deploy units без повного переходу на microservices.

⸻

🎫 AGSYS-3721 — Define deploy unit boundaries

Description
Зафіксувати окремі deploy units:
	•	frontend/client
	•	control plane
	•	runtime plane

Acceptance Criteria
	•	deploy units описані
	•	кожен має entrypoint
	•	зрозумілі runtime dependencies

⸻

🎫 AGSYS-3722 — Split runtime and control-plane startup contracts

Description
Розвести startup конфіги й env контракти між runtime та control plane.

Acceptance Criteria
	•	окремі startup contracts
	•	окремі env docs
	•	можна запускати незалежно

⸻

🎫 AGSYS-3723 — Prepare separate local/dev startup flows

Description
Підготувати зрозумілий local startup для нової topology.

Acceptance Criteria
	•	локально можна запускати окремо client/control-plane/runtime
	•	docs оновлені
	•	немає only-one-way startup path

⸻

⸻

🧩 EPIC 37.8 — CI/CD & Developer Workflow Foundation

🎯 Goal

Підготувати repo до selective builds і нормальної dev velocity.

⸻

🎫 AGSYS-3724 — Define selective build strategy

Description
Визначити, як білдити лише змінені apps/packages.

Acceptance Criteria
	•	стратегія описана
	•	scripts/tooling підтримують partial builds
	•	немає залежності від full-rebuild for everything

⸻

🎫 AGSYS-3725 — Add workspace-aware dev scripts

Description
Оновити scripts для monorepo topology.

Acceptance Criteria
	•	dev scripts запускають конкретні apps/packages
	•	build/test/lint адресні
	•	root scripts не хаотичні

⸻

🎫 AGSYS-3726 — Document developer topology

Description
Описати нову модель repo для розробників.

Acceptance Criteria
	•	є README/architecture note
	•	зрозуміло, де app, де package, де deploy unit
	•	onboarding не ламається

⸻

⸻

🧩 EPIC 37.9 — Verification & Safety Net

🎯 Goal

Довести, що реорг не зламав систему і справді покращив topology.

⸻

🎫 AGSYS-3727 — Architecture parity verification

Description
Перевірити, що behavior не змінився після реоргу.

Acceptance Criteria
	•	key flows працюють
	•	routing/API/runtime parity збережена
	•	no hidden regressions in critical paths

⸻

🎫 AGSYS-3728 — Build/deploy verification matrix

Description
Перевірити нові build contexts і startup flows.

Acceptance Criteria
	•	client build працює
	•	control plane build працює
	•	runtime build працює
	•	локальний запуск працює

⸻

🎫 AGSYS-3729 — Dependency and topology audit closure report

Description
Фінальний звіт по спринту.

Acceptance Criteria
	•	нова topology описана
	•	main bottlenecks before/after documented
	•	рекомендації для 35.5B / 36 / наступних спринтів сформульовані

⸻

🧪 Definition of Done — Sprint 37

Спринт завершений, якщо:
	•	repo став multi-package monorepo
	•	frontend має app boundary
	•	backend god-object декомпозований
	•	runtime / governance / billing / memory / shared мають окремі package boundaries
	•	Docker більше не білдить весь repo без потреби
	•	deploy units визначені
	•	data ownership formalized
	•	dependency graph очищений
	•	behavior parity збережена

⸻

🚨 Що буде fail для спринта

Спринт НЕ можна вважати успішним, якщо:
	•	просто перенесли файли по папках без справжніх boundaries
	•	agentSystemBackend.ts лишився тим самим монолітом
	•	Docker все ще копіює весь repo
	•	немає package contracts
	•	немає clear deploy units
	•	dependency chaos залишився
	•	runtime/control-plane все ще нерозрізнені фізично

⸻

🔥 Після Sprint 37

Ось тоді вже стає логічно робити:
	•	35.5B — Interface Separation
бо з’являються реальні app boundaries
	•	36 — Product Layer
бо з’являється правильний platform shape

⸻
