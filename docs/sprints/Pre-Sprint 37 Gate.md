🟪 Pre-Sprint 37 Gate — Repository Topology & Service Architecture Audit

🧾 Meta
	•	Gate ID: PRE-37
	•	Name: Repository Topology & Service Architecture Audit
	•	Purpose: зрозуміти фактичну архітектуру, фізичну структуру коду та готовність до масштабування
	•	Decision target:
	•	чи у вас моноліт, modular monolith чи pseudo-microservices
	•	які компоненти є реальними сервісами
	•	як правильно реорганізувати repo
	•	чи потрібен multi-repo

⸻

1. Executive Purpose

Зараз система:
	•	швидко еволюціонувала
	•	має багато доменів (runtime, governance, billing, memory, UI)
	•	але фізично живе в одному repo без чітких boundaries

Це створює ризики:
	•	складно масштабувати
	•	складно деплоїти
	•	складно зрозуміти ownership
	•	складно контролювати залежності

⸻

2. Core Questions Gate

Потрібно відповісти на 5 ключових питань:
	1.	Що у нас зараз: моноліт, modular monolith чи microservices?
	2.	Які компоненти реально є окремими сервісами (логічно і фізично)?
	3.	Які частини повинні мати незалежний deploy lifecycle?
	4.	Які частини є shared libraries, а не сервіси?
	5.	Чи готова система до cloud/distributed deployment?

⸻

3. Repository Structure Audit

3.1 Physical Structure
	•	Чи структура repo відображає архітектуру?
	•	Чи є явні папки:
	•	apps
	•	services
	•	packages
	•	infra
	•	Чи код перемішаний без чітких меж?

👉 PASS: структура відповідає доменам
👉 FAIL: “все всюди”

⸻

3.2 Layer Mixing
	•	Чи фронтенд, бекенд і runtime код змішані?
	•	Чи API handlers, бізнес-логіка і orchestration лежать разом?

👉 PASS: чітке розділення
👉 FAIL: layer chaos

⸻

3.3 Ownership
	•	Чи зрозуміло, хто “власник” кожної частини?
	•	Чи є domain boundaries?

👉 PASS: ownership очевидний
👉 FAIL: “shared everything”

⸻

⸻

4. Service Identification

4.1 Logical Services

Визначити всі кандидати:
	•	control plane
	•	API backend
	•	runtime dispatcher
	•	worker system
	•	governance engine
	•	asset registry
	•	billing
	•	telemetry
	•	auth/IAM

Questions
	•	Чи ці компоненти логічно незалежні?
	•	Чи вони мають власні responsibilities?

⸻

4.2 Physical Services
	•	Чи ці сервіси реально окремо запускаються?
	•	Чи є окремі entry points?
	•	Чи все запускається одним процесом?

👉 PASS: окремі процеси
👉 FAIL: один runtime everything

⸻

4.3 Deploy Units
	•	Чи можна задеплоїти кожен компонент окремо?
	•	Чи всі зміни потребують деплою всього backend?

👉 PASS: незалежний деплой
👉 FAIL: all-or-nothing deploy

⸻

⸻

5. Runtime Architecture

5.1 Process Model
	•	Чи є:
	•	один процес
	•	кілька процесів
	•	worker pool

5.2 Worker Isolation
	•	Чи worker-и ізольовані?
	•	Чи вони окремі процеси/контейнери?

5.3 Communication
	•	Як сервіси взаємодіють:
	•	in-memory
	•	Redis
	•	HTTP
	•	queue

👉 PASS: externalized communication
👉 FAIL: tight coupling

⸻

⸻

6. Data Layer Audit

6.1 Databases
	•	Які бази використовуються:
	•	SQLite
	•	Postgres
	•	Redis
	•	FS

6.2 Ownership
	•	Чи зрозуміло, який сервіс володіє якими даними?

6.3 Coupling
	•	Чи кілька сервісів читають/пишуть одну DB без контрактів?

👉 PASS: clear ownership
👉 FAIL: shared uncontrolled DB

⸻

⸻

7. Docker & Build System

7.1 Dockerfiles
	•	Чи є окремий Dockerfile на сервіс?
	•	Чи один Dockerfile на весь проект?

7.2 Build Context
	•	Чи кожен сервіс будується незалежно?
	•	Чи Docker копіює весь repo?

👉 PASS: isolated builds
👉 FAIL: full repo build

⸻

7.3 Image Size & Efficiency
	•	Чи images мінімізовані?
	•	Чи є multi-stage builds?

⸻

⸻

8. CI/CD & Deployment

8.1 Pipelines
	•	Чи pipeline:
	•	один глобальний
	•	чи per-service?

8.2 Selective Builds
	•	Чи можна білдити тільки змінений сервіс?

8.3 Environment Separation
	•	staging / prod / dev ізольовані?

⸻

⸻

9. Shared Code vs Services

9.1 Shared Packages
	•	Чи є:
	•	shared types
	•	SDK
	•	contracts

9.2 Dependency Graph
	•	Чи є циклічні залежності?

👉 PASS: clean graph
👉 FAIL: spaghetti imports

⸻

⸻

10. Infra & Cloud Readiness

10.1 Infra Definition
	•	Чи є:
	•	Terraform
	•	Kubernetes configs
	•	Docker compose тільки?

10.2 Cloud Deployment
	•	Чи можна підняти систему в AWS/GCP?

10.3 Scaling Model
	•	Чи можна:
	•	масштабувати workers?
	•	масштабувати API?
	•	масштабувати runtime?

👉 PASS: scalable
👉 FAIL: single-node only

⸻

⸻

11. Critical Bottlenecks

Потрібно виявити:
	•	single backend bottleneck
	•	in-memory queue
	•	filesystem dependency
	•	tight coupling runtime ↔ API
	•	shared DB contention

⸻

⸻

12. Architecture Classification (must answer)

В кінці потрібно класифікувати:

[ ] Monolith
[ ] Modular Monolith
[ ] Monorepo Microservices (logical)
[ ] Real Distributed Microservices


⸻

⸻

13. Target Architecture Readiness

Questions
	•	Чи готова система до:
	•	multi-tenant
	•	distributed runtime
	•	independent scaling
	•	service isolation

⸻

⸻

14. Output Format

## Pre-Sprint 37 Gate Report

### 1. Executive Summary
- Current architecture type:
- Repo state:
- Main issues:

### 2. Repository Structure
...

### 3. Service Topology
...

### 4. Runtime Model
...

### 5. Data Layer
...

### 6. Docker & Build
...

### 7. CI/CD
...

### 8. Shared Code Analysis
...

### 9. Infra Readiness
...

### 10. Bottlenecks
...

### 11. Architecture Classification
...

### 12. Recommendations
- Short-term:
- Mid-term:
- Long-term:


⸻

15. Decision Gate (final answers)

Потрібно чітко відповісти:
	1.	Чи залишаємо monorepo чи рухаємось до multi-repo?
	2.	Які сервіси треба виділити в окремі deploy units?
	3.	Які частини мають лишитися shared packages?
	4.	Які bottlenecks блокують масштабування?
	5.	Який мінімальний реорг потрібен зараз (без overengineering)?

⸻

🧠 Final Thought

Цей gate — дуже важливий, бо:

❗ якщо зараз просто “рознести по сервісах”, можна зробити ще більший хаос
❗ якщо нічого не робити — система перестане масштабуватися

Тому це саме той момент, де треба:
👉 не кодувати
👉 а зрозуміти, що у вас вже є насправді

⸻