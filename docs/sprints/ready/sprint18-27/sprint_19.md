🟥 Sprint 19 — Real Multi-Agent Runtime (Distributed Execution Layer)

⸻

🎯 Sprint Goal

Перетворити існуючий runtime з:

pseudo multi-agent (один процес, рольова імітація)

в:

реальний multi-agent runtime (із ізольованими процесами на агента)

⸻

🧠 Problem Statement

Зараз:
	•	multiple_agents ≈ quasi-linear
	•	один runtime:
	•	керує всіма агентами
	•	виконує все послідовно

⸻

❗ Наслідки
	•	❌ немає паралельності
	•	❌ немає ізоляції
	•	❌ немає реального swarm
	•	❌ governance/loops не працюють як задумано
	•	❌ Workbench concurrency не має сенсу

⸻

🧩 Target Architecture

⸻

🔥 Core принцип

КОЖЕН агент = окремий runtime worker (процес)

⸻

🧱 Основні компоненти

⸻

1. Agent Worker (новий рівень)

Для кожного агента:
	•	окремий процес
	•	власна памʼять
	•	власний lifecycle

⸻

2. Task Queue (Redis-based)
	•	task → queue
	•	agent → забирає task
	•	async execution

⸻

3. Swarm Controller (реальний)
	•	запускає агентів
	•	тримає registry
	•	моніторить:
	•	статус
	•	heartbeat
	•	health

⸻

4. Agent Lifecycle Manager
	•	spawn
	•	restart
	•	kill
	•	scale

⸻

5. Event Bus (вже є → розширити)
	•	agent started
	•	agent idle
	•	agent busy
	•	task assigned
	•	task completed

⸻

⸻

🧠 Execution Model (як має працювати)

⸻

🟢 Flow

PM → план → task queue

↓

Agent Worker (Dev) picks task

↓

Executes independently

↓

Publishes event

↓

Next agent picks next stage


⸻

❗ Ключове

👉 НІЯКОГО центрального “brain loop”

⸻

🧠 Modes

⸻

Quasi-linear
	•	1 process
	•	debug / default mode

⸻

Multiple Agents (target)
	•	N processes
	•	Redis coordination
	•	async execution

⸻

⸻

🧪 Success Criteria

⸻

✅ Реальна паралельність
	•	≥2 агенти працюють одночасно
	•	підтверджено events

⸻

✅ Ізоляція
	•	кожен агент:
	•	окремий process
	•	окрема памʼять

⸻

✅ Task Queue працює
	•	task не виконується миттєво
	•	agent підбирає task

⸻

✅ Swarm Controller = реальний
	•	показує:
	•	PID / worker
	•	status
	•	load

⸻

✅ Worker lifecycle
	•	crash → restart
	•	idle → standby
	•	busy → active

⸻

✅ No central orchestration
	•	runtime не виконує всі ролі

⸻

⸻

🧠 Scope

⸻

✔️ Входить
	•	worker runtime
	•	queue system
	•	swarm controller (реальний)
	•	lifecycle manager
	•	heartbeat system

⸻

❌ НЕ входить
	•	UI (Sprint 18)
	•	governance changes
	•	evaluator changes

⸻

⸻

🧠 Key Design Decisions

⸻

🔹 1. НЕ infra scripts запускають worker-и

👉 ти правильно сказав

⸻

🔹 2. Workers створюються динамічно
	•	при створенні project
	•	на основі agent config

⸻

🔹 3. Agent = декларативна сутність
	•	agent file → worker instance

⸻

🔹 4. Redis = coordination layer
	•	queue
	•	pub/sub
	•	memory

⸻

⸻

🧠 Critical Risks

⸻

⚠️ 1. Race conditions

→ потрібно locking / queue discipline

⸻

⚠️ 2. Memory leakage між агентами

→ strict namespace

⸻

⚠️ 3. Zombie workers

→ heartbeat + cleanup

⸻

⚠️ 4. Over-scaling

→ max workers per project

⸻

⸻

🧠 Definition of Done

⸻

Спринт завершений, якщо:
	•	multiple_agents ≠ quasi-linear
	•	агенти = окремі процеси
	•	є паралельне виконання
	•	swarm controller показує реальний стан
	•	task queue працює
	•	є lifecycle manager

⸻

⸻

💥 Найважливіший момент

Ти дуже точно сказав:

“для кожного агента має бути окремий демон”

Це і є:

👉 core missing piece всієї системи

⸻

🚀 Висновок

Sprint 19 = не просто фікс

Це:

🔥 перехід з “імітації агентів” → “реальна агентна система”

⸻