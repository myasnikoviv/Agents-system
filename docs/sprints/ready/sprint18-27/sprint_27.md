🟪 Sprint 27 — Runtime Control Plane & Service Orchestration Layer

⸻

🎯 Goal

Побудувати єдиний Control Plane, який:
	•	знає про всі сервіси системи
	•	керує їх lifecycle (start/stop/restart)
	•	моніторить їх стан
	•	забезпечує відповідність desired state ↔ actual state
	•	працює:
	•	локально (self-hosted)
	•	і готовий до cloud/container orchestration

⸻

🧠 Core Idea

До цього моменту система:
	•	вже має багато сервісів:
	•	backend
	•	runtime
	•	workers
	•	queue
	•	telemetry
	•	storage
	•	але:
	•	запускається скриптами
	•	не має єдиного orchestration layer
	•	не має централізованого контролю

⸻

❗ Проблема

Без Control Plane:
	•	❌ немає єдиного джерела правди про стан системи
	•	❌ немає автоматичного recovery
	•	❌ немає health visibility
	•	❌ складно масштабувати
	•	❌ складно переносити в cloud

⸻

🧩 Що вводиться

👉 Platform Control Plane

Це новий шар системи, який:
	•	НЕ виконує бізнес-логіку
	•	НЕ є runtime
	•	НЕ є governance

А є:

🧠 “менеджером платформи”

⸻

🏗️ Архітектура

⸻

1. Service Registry (декларативний шар)

Опис всіх сервісів системи:

services:
  backend:
    type: api
    runtime: node
    health: /health
    desired: running

  runtime-dispatcher:
    type: worker
    runtime: node
    desired: running

  redis:
    type: infra
    runtime: docker


⸻

📌 Властивості
	•	декларативний
	•	не містить логіки
	•	source of truth для Control Plane

⸻

2. Control Plane Core

Головний компонент:

Responsibilities:
	•	читати registry
	•	знати desired state
	•	перевіряти actual state
	•	запускати reconciliation loop

⸻

3. Reconciliation Loop (ключ системи)

desired state != actual state → fix it

Приклади:

Ситуація	Дія
сервіс впав	restart
сервіс не стартував	start
зайвий інстанс	stop
unhealthy	restart


⸻

4. Execution Adapters

Control Plane НЕ запускає сервіси напряму.

Він використовує adapters:
	•	LocalProcessAdapter
	•	DockerAdapter
	•	(майбутнє) CloudAdapter / K8sAdapter

⸻

5. Health Monitoring Layer

Для кожного сервісу:
	•	alive
	•	ready
	•	degraded
	•	failed

Методи:
	•	HTTP health endpoints
	•	heartbeat
	•	process status

⸻

6. Service State Store

Control Plane тримає:
	•	status
	•	last check
	•	restart count
	•	error reason

⸻

7. Control API

startService(id)
stopService(id)
restartService(id)
getStatus(id)
listServices()


⸻

8. Telemetry Integration

Control Plane:
	•	пише events:
	•	service.started
	•	service.failed
	•	service.restarted
	•	інтегрується з telemetry layer

⸻

🧠 Принципи

⸻

1. Declarative over Imperative

НЕ:

“запусти backend”

А:

“backend має бути running”

⸻

2. Reconciliation-driven system

НЕ:

“запустили — і забули”

А:

“система постійно перевіряє і виправляє”

⸻

3. Adapter-based execution

НЕ:

“ми запускаємо процеси напряму”

А:

“ми делегуємо запуск адаптерам”

⸻

4. No Business Logic Inside

Control Plane НЕ знає:
	•	що таке агент
	•	що таке task
	•	що таке governance

⸻

5. Portable by Design

Те саме ядро працює:
	•	локально
	•	у Docker
	•	у cloud

⸻

🧱 Scope

⸻

✔️ Входить
	•	service registry
	•	control plane core
	•	reconciliation loop
	•	execution adapters (local + docker)
	•	health checks
	•	restart policy
	•	control API
	•	telemetry events
	•	базовий monitoring

⸻

❌ НЕ входить
	•	autoscaling cluster
	•	Kubernetes orchestration
	•	distributed control plane
	•	service mesh
	•	advanced SRE tooling

⸻

🧪 Success Criteria

⸻

✅ Є Service Registry
	•	всі сервіси описані декларативно

⸻

✅ Є Control Plane
	•	один entrypoint керування системою

⸻

✅ Reconciliation працює
	•	сервіс впав → відновився
	•	сервіс не стартував → стартує

⸻

✅ Health monitoring є
	•	видно стан кожного сервісу

⸻

✅ Restart policy працює
	•	сервіси не “висять мертвими”

⸻

✅ Adapter abstraction існує
	•	локально і через Docker

⸻

✅ System більше не залежить від shell-скриптів
	•	scripts → тільки thin wrapper

⸻

📊 Expected Outcome

Після Sprint 27:

⸻

🔹 Для тебе (локально)
	•	ти запускаєш систему як платформу
	•	бачиш всі сервіси
	•	можеш керувати ними
	•	система сама відновлюється

⸻

🔹 Для майбутнього SaaS
	•	є control plane (як у k8s, тільки простіше)
	•	можна підключити:
	•	cloud adapters
	•	autoscaling
	•	distributed execution

⸻

💥 Ключова зміна мислення

⸻

До Sprint 27:

“у мене є купа сервісів і скрипт, який їх запускає”

⸻

Після Sprint 27:

“у мене є платформа, яка управляє своїм станом”

⸻

🧠 Як це лягає у roadmap
	•	Sprint 25 → архітектура
	•	Sprint 26 → multi-user runtime
	•	Sprint 27 → platform control layer
	•	Sprint 28+ → scaling / SaaS / monetization

⸻
