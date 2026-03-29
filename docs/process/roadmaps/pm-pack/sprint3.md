Супер. Тут дуже важливо:
👉 Sprint 3 — це вже не дослідження, а hardening (закріплення моделі).
👉 Тобто після Sprint 2 у нас вже є правда, і тепер ми її закодовуємо в гарантії.

⸻

🟨 SPRINT 3 — Memory & Agent Model Hardening

🎯 Мета

Зробити систему:
	•	передбачуваною
	•	ізольованою
	•	стабільною між сесіями
	•	без leakage між проєктами / чатами / агентами

👉 Це фундамент для всього (і для твоєї “Ralf Vig” моделі теж)

⸻

📦 Структура спринту (PM Ready)

⸻

🧩 EPIC 9 — Memory Model Hardening

⸻

🔧 Problem (з артефактів)
	•	Redis / LangGraph / SQLite → гібрид
	•	неясно:
	•	де що зберігається
	•	як гідрується
	•	що persistent, що ні
	•	ризик:
	•	leakage
	•	дублювання
	•	inconsistent state

⸻

🎯 Goal

👉 Ввести строгий memory contract

⸻

🧱 Task 9.1 — Define Memory Contract

Що зробити

Формалізувати:

type MemoryLayers = {
  project: {}
  chain: {}
  run: {}
  agent: {}
}


⸻

Потрібно зафіксувати

Layer	Scope	Storage	Lifetime
project	весь проєкт	?	persistent
chain	чат	?	persistent
run	один запит	ephemeral	
agent	агент	?	?


⸻

Deliverable
	•	Memory Contract Spec.md

⸻

🧱 Task 9.2 — Enforce Memory Boundaries

Що зробити
	•	кожен доступ до memory має перевіряти:
	•	projectId
	•	chainId
	•	runId

⸻

Acceptance
	•	неможливо:
	•	прочитати memory іншого project
	•	прочитати інший chain

⸻

🧱 Task 9.3 — Hydration Rules

Що зробити

визначити:

onProjectLoad()
onChainOpen()
onRunStart()


⸻

Acceptance
	•	reload не ламає контекст
	•	старі чати відновлюються коректно

⸻

⸻

🧩 EPIC 10 — Agent Identity Model

⸻

🔧 Problem
	•	агенти динамічні
	•	неясно:
	•	коли новий агент
	•	коли той самий
	•	ризик:
	•	дублювання
	•	втрата памʼяті

⸻

🎯 Goal

👉 deterministic identity для агентів

⸻

🧱 Task 10.1 — Define Agent Identity Key

type AgentId = {
  projectId: string
  agentSlug: string
}


⸻

❗ Заборонено
	•	генерувати новий agentId на кожен run

⸻

Acceptance
	•	один агент = один identity в межах project

⸻

🧱 Task 10.2 — Agent Lifecycle

Що зробити

описати lifecycle:

created → active → reused → archived


⸻

Acceptance
	•	новий чат ≠ новий агент
	•	агент переиспользовується

⸻

🧱 Task 10.3 — Agent Memory Binding

Що зробити

agent.memory.namespace = `${projectId}:${agentSlug}`


⸻

Acceptance
	•	памʼять агента не змішується між проєктами

⸻

⸻

🧩 EPIC 11 — Project Isolation Guarantees

⸻

🔧 Problem
	•	однакові агенти в різних проєктах
	•	shared templates
	•	ризик cross-project leakage

⸻

🎯 Goal

👉 повна ізоляція проєктів

⸻

🧱 Task 11.1 — Namespace Enforcement

Усі ключі:

key = `${projectId}:${chainId}:${entity}`


⸻

Acceptance
	•	немає global state без projectId

⸻

🧱 Task 11.2 — AgentContextPath Isolation

(з AGSYS-239)

👉 тепер кожен проект має:

agentContextPath


⸻

Що зробити
	•	перевірити:
	•	що discovery йде тільки з project path
	•	що немає fallback на cwd

⸻

Acceptance
	•	проект НЕ бачить агентів іншого проекту

⸻

🧱 Task 11.3 — Cross-Project Test

Test

Project A → write memory
Project B → read memory


⸻

Expected

❌ нічого не бачить

⸻

⸻

🧩 EPIC 12 — Context Assembly Stabilization

⸻

🔧 Problem
	•	prompt формується “магічно”
	•	різні джерела
	•	дублювання

⸻

🎯 Goal

👉 deterministic prompt assembly

⸻

🧱 Task 12.1 — Define Context Pipeline

context = [
  system,
  project,
  chain,
  agent,
  current input
]


⸻

Acceptance
	•	завжди один порядок
	•	немає дублювання

⸻

🧱 Task 12.2 — Context Size Control

Що зробити
	•	max messages
	•	trimming strategy

⸻

Acceptance
	•	контекст не росте безконтрольно

⸻

🧱 Task 12.3 — Debug Context Output

Що зробити
	•	можливість експорту:
	•	final context
	•	перед LLM

⸻

Acceptance
	•	можна побачити “що реально пішло в модель”

⸻

⸻

🧩 EPIC 13 — State Reset & Recovery

⸻

🔧 Problem
	•	stuck state
	•	незавершені run-и
	•	зависання

⸻

🎯 Goal

👉 система не застрягає

⸻

🧱 Task 13.1 — Run Cancellation

Що зробити
	•	новий input → cancel previous run

⸻

Acceptance
	•	немає overlap run-ів

⸻

🧱 Task 13.2 — Orphan Cleanup

Що зробити
	•	чистити:
	•	незавершені run-и
	•	dangling processes

⸻

Acceptance
	•	немає “зависших агентів”

⸻

🧱 Task 13.3 — Recovery Strategy

Що зробити
	•	при crash:
	•	відновити state
	•	або clean reset

⸻

Acceptance
	•	система не ламається після reload

⸻

⸻

🧪 TEST SUITE (SPRINT 3)

⸻

Test 9 — Memory isolation

Project A → write
Project B → read

✔ isolation

⸻

Test 10 — Agent reuse
	•	новий чат
✔ агент той самий

⸻

Test 11 — Context assembly

✔ deterministic

⸻

Test 12 — Reload

✔ state відновлюється

⸻

Test 13 — Cancel

✔ старий run не впливає

⸻

⸻

🛑 STOP CONDITION

Після Sprint 3:

✔ memory deterministic
✔ agents стабільні
✔ isolation гарантована
✔ context predictable

❌ НЕ робимо:
	•	workflow automation
	•	PM logic
	•	UI improvements

⸻

⚠️ Найважливіше

👉 Sprint 3 = фундамент

Якщо тут помилка:
	•	вся система буде глючити
	•	і ти будеш ловити “привидів” багів

⸻
