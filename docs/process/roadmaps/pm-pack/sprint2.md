Супер. Тепер можна йти в Sprint 2, але вже на базі того, що в Sprint 1 у нас:
	•	є event timeline (джерело істини)
	•	є prompt tracing
	•	є контроль loop-ів
	•	є ізоляція run/context

👉 Тобто тепер ми не “вгадуємо”, як система працює — ми бачимо це через events і тести.

⸻

🟩 SPRINT 2 — Execution Model Validation

🎯 Головна ціль

Перетворити “здається працює” → у доведено, як саме працює

⸻

🧩 EPIC 5 — Execution Modes Truth Model

⸻

🔧 Problem

Зараз:
	•	mock, quasi-linear, multiple_agents — це більше декларація, ніж гарантія
	•	реальна поведінка не зафіксована
	•	можуть бути однакові graph-и під різними назвами

⸻

🎯 Goal

Зробити truth model execution режимів, яка:
	•	підтверджена тестами
	•	базується на events (з Sprint 1)
	•	є deterministic

⸻

🧱 Що треба зробити

1. Визначити контракт режиму

type ExecutionModeSpec = {
  mode: 'mock' | 'quasi-linear' | 'multiple_agents'

  expectedBehavior: {
    agentCount: number
    handoff: boolean
    parallelism: boolean
    graphType: 'single' | 'multi' | 'dynamic'
  }
}


⸻

2. Побудувати Truth Table

Mode	Agents	Handoff	Parallel	Реальний Graph
mock	?	?	?	?
quasi-linear	?	?	?	?
multiple_agents	?	?	?	?


⸻

3. Підтвердити через events

Перевірка через:
	•	agent.started
	•	swarm.handoff
	•	llm.request
	•	run.completed

⸻

🧪 Tests

Test 5.1 — Mode = quasi-linear

Input:

зроби аналіз у 3 етапи

Check:
	•	agents запускаються ПОСЛІДОВНО
	•	handoff є
	•	parallelism = false

⸻

Test 5.2 — Mode = multiple_agents

Input:

розбий задачу на 3 незалежні частини

Check:
	•	кілька agent.started
	•	overlapping timestamps
	•	handoff або fan-out

⸻

✅ Acceptance
	•	truth table заповнена
	•	кожен mode підтверджений через events
	•	немає “невідомої поведінки”

⸻

🛑 Stop Rule

Якщо:
	•	quasi-linear = той самий graph що multiple

👉 зафіксувати, НЕ рефакторити

⸻

🧩 EPIC 6 — Handoff Verification System

⸻

🔧 Problem
	•	handoff може бути fake (просто текст)
	•	немає гарантії, що реально кілька агентів працювали

⸻

🎯 Goal

Довести, що handoff — реальний runtime процес

⸻

🧱 Що зробити

1. Ввести handoff invariant

Handoff існує, якщо:

agent_A.completed → swarm.handoff → agent_B.started


⸻

2. Валідація

type HandoffProof = {
  from: string
  to: string
  timestamp: number
}


⸻

3. Логіка перевірки
	•	мінімум 2 агенти
	•	є хоча б 1 handoff event

⸻

🧪 Tests

Test 6.1 — Simple handoff

Input:

зроби план і реалізацію

Check:
	•	agent PM → Developer
	•	є swarm.handoff

⸻

Test 6.2 — Multi-handoff

Check:
	•	≥2 handoffs

⸻

✅ Acceptance
	•	handoff підтверджений через events
	•	не текстом, а реальною оркестрацією

⸻

🧩 EPIC 7 — Parallel Execution Proof

⸻

🔧 Problem
	•	multi-agent ≠ parallel
	•	може бути sequential під виглядом multi

⸻

🎯 Goal

Довести або спростувати реальний паралелізм

⸻

🧱 Definition

Parallel =

agent_A.started
agent_B.started

timestamps overlap


⸻

🧪 Tests

Test 7.1 — Parallel tasks

Input:

зроби 2 незалежні задачі:
1. створити API
2. написати тест

Check:
	•	2 agent.started
	•	timestamps overlap

⸻

Test 7.2 — Stress test
	•	3+ tasks

⸻

✅ Acceptance
	•	або:
	•	паралелізм підтверджений
	•	або:
	•	зафіксовано, що його нема

⸻

🛑 ВАЖЛИВО

👉 якщо нема паралелізму — це OK
👉 головне — правда, а не ілюзія

⸻

🧩 EPIC 8 — Multi-Message Stability

⸻

🔧 Problem
	•	carryover
	•	stuck state
	•	попередній контекст впливає

⸻

🎯 Goal

Стабільність у серії повідомлень

⸻

🧱 Rules
	•	кожен message = новий run
	•	run ізольований

⸻

🧪 Tests

Test 8.1 — 2-step

1: що таке API
2: що таке база даних

Check:
	•	відповідь 2 не містить API

⸻

Test 8.2 — 5-step
	•	довга серія

⸻

Test 8.3 — interruption

1: складна задача
2: стоп, нове питання

Check:
	•	старий run завершений
	•	новий чистий

⸻

✅ Acceptance
	•	немає змішування
	•	немає зависань

⸻

🧩 EPIC 9 — Provider Consistency Validation

⸻

🔧 Problem
	•	різні executors можуть вести себе по-різному

⸻

🎯 Goal

Єдина поведінка незалежно від provider

⸻

🧱 Scope

Тестуємо:
	•	Codex CLI
	•	OpenHands (Gemini)

⸻

🧪 Tests

Test 9.1 — Same prompt

Input:

зроби аналіз

Check:
	•	структура однакова
	•	handoff є
	•	events однакові

⸻

Test 9.2 — Retry behavior

Check:
	•	однакова логіка retries

⸻

✅ Acceptance
	•	немає критичних відмінностей
	•	або всі відмінності задокументовані

⸻

🧪 GLOBAL TEST MATRIX

⸻

Після Sprint 2 має бути:

type Verified = {
  modes: boolean
  handoff: boolean
  parallelism: boolean
  multiMessage: boolean
  providers: boolean
}


⸻

🛑 STOP CONDITION

Після Sprint 2:

✔ ти знаєш:
	•	як працює кожен режим
	•	чи є паралелізм
	•	чи є реальний handoff
	•	чи стабільна система

❌ НЕ робимо:
	•	UI поліш
	•	workflow
	•	автоматизацію

⸻

⚠️ КРИТИЧНИЙ ПРИНЦИП

👉 Sprint 2 = “правда про систему”

Не:

“як має бути”

А:

“як є насправді”

⸻
