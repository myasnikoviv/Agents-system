🟥 Sprint 21 — Control Layer (Agent Orchestration Control Plane)

⸻

🎯 Goal

Дати користувачу реальний контроль над агентською системою, а не тільки спостереження.

Тобто:
	•	не просто бачити swarm
	•	а керувати ним як distributed system

⸻

🧠 Core Idea

Якщо Sprint 20 = “observability”
то Sprint 21 = “control plane”

⸻

🧩 EPICS

⸻

🟫 EPIC 1 — Worker Control Actions

⸻

🎫 S21-1 — Pause / Resume Worker

Business Goal

Можливість призупинити агента без втрати стану

⸻

Acceptance Criteria
	•	Можна pause worker
	•	Worker:
	•	не бере нові задачі
	•	завершує поточну (або freeze — configurable)
	•	Resume повертає worker в queue
	•	State відображається в UI

⸻

Handoff

PM → Frontend → Backend → QA → PM

⸻

⸻

🎫 S21-2 — Kill / Restart Worker

Business Goal

Контроль над зависшими/битими агентами

⸻

Acceptance Criteria
	•	Kill завершує процес
	•	Restart:
	•	створює новий worker instance
	•	Відображається lifecycle:
	•	killed → starting → hot
	•	Нема zombie workers

⸻

⸻

🎫 S21-3 — Force Task Reassignment

Business Goal

Перенаправити задачу іншому агенту

⸻

Acceptance Criteria
	•	Можна вручну reasssign task
	•	Старий worker:
	•	зупиняє виконання
	•	Новий worker отримує task
	•	Лог зберігає історію reassignment

⸻

⸻

🟩 EPIC 2 — Task Control

⸻

🎫 S21-4 — Retry Task

Business Goal

Перезапуск задачі

⸻

Acceptance Criteria
	•	Retry створює новий execution
	•	Старий execution не перезаписується
	•	Видно retry count

⸻

⸻

🎫 S21-5 — Cancel Task

Business Goal

Зупинка задачі

⸻

Acceptance Criteria
	•	Task можна cancel
	•	Worker:
	•	зупиняється
	•	Queue очищається від task
	•	Status = cancelled

⸻

⸻

🎫 S21-6 — Task Priority Override

Business Goal

Контроль порядку виконання

⸻

Acceptance Criteria
	•	Можна підняти task priority
	•	Queue reorder працює
	•	Dispatch враховує priority

⸻

⸻

🟪 EPIC 3 — Governance Control Integration

⸻

🎫 S21-7 — Manual Override for Gates

Business Goal

Можливість обійти gate

⸻

Acceptance Criteria
	•	Можна override:
	•	preflight
	•	postflight
	•	governance rule
	•	Override логиться
	•	Видно хто зробив override

⸻

⸻

🎫 S21-8 — Force Loop Execution

Business Goal

Запустити loop вручну

⸻

Acceptance Criteria
	•	Можна запустити:
	•	improvement loop
	•	validation loop
	•	Loop виконується поза основним flow

⸻

⸻

🟧 EPIC 4 — Routing & Agent Selection Control

⸻

🎫 S21-9 — Manual Agent Selection

Business Goal

Контроль routing

⸻

Acceptance Criteria
	•	Можна вручну вибрати:
	•	agent
	•	pipeline
	•	Routing bypass автоматичного вибору

⸻

⸻

🎫 S21-10 — Skill / Pipeline Enforcement Override

Business Goal

Контроль використання інфраструктури

⸻

Acceptance Criteria
	•	Можна змусити використовувати:
	•	конкретний pipeline
	•	конкретний skill
	•	Runtime перевіряє виконання

⸻

⸻

🟥 EPIC 5 — Swarm Control Dashboard

⸻

🎫 S21-11 — Bulk Worker Control

Business Goal

Керування групами агентів

⸻

Acceptance Criteria
	•	Pause all workers (project)
	•	Kill all workers
	•	Restart group

⸻

⸻

🎫 S21-12 — Project-level Control Panel

Business Goal

Контроль всього проекту

⸻

Acceptance Criteria
	•	Controls:
	•	pause project
	•	resume project
	•	clear queue
	•	Впливає на всі workers

⸻

⸻

🟦 EPIC 6 — Safety & Audit Layer

⸻

🎫 S21-13 — Action Audit Log

Business Goal

Фіксувати всі дії користувача

⸻

Acceptance Criteria
	•	Лог:
	•	pause
	•	kill
	•	override
	•	Є:
	•	user
	•	timestamp
	•	reason

⸻

⸻

🎫 S21-14 — Confirmation & Safeguards

Business Goal

Уникнути випадкових дій

⸻

Acceptance Criteria
	•	Confirm dialogs для:
	•	kill
	•	override
	•	Danger actions виділені

⸻

⸻

🧠 Definition of Done

⸻

Система дозволяє:
	•	зупинити будь-який агент
	•	перезапустити execution
	•	вручну керувати routing
	•	override governance
	•	контролювати queue
	•	контролювати проект як систему

⸻

💥 Результат Sprint 21

Після цього у тебе буде:

🔹 Як було
	•	AI щось робить
	•	ти дивишся

🔹 Як стане
	•	ти керуєш системою як DevOps:
	•	процеси
	•	черги
	•	агенти
	•	правила

⸻

🔥 Важливий момент

Це вже рівень:

Kubernetes / Airflow / Ray — але для AI агентів

⸻