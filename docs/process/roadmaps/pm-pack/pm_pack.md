🧠 Як ми це зробимо (щоб НЕ було галюцинацій)

Ми НЕ робимо:

“ось 50 задач, вперед”

Ми робимо 2 рівні:

🔹 Рівень 1 — PM Package (що робимо і в якому порядку)
	•	Спринти
	•	Епіки
	•	Чіткі deliverables
	•	Stop conditions
	•	Залежності

👉 Це ти одразу віддаєш у Plane

⸻

🔹 Рівень 2 — Execution Specs (як саме робити)
	•	окремо, по кожному епіку
	•	з чіткими acceptance criteria
	•	з test cases
	•	з “definition of done”

👉 ми будемо робити їх ПОСТУПОВО, після кожного спринту

⸻

🚫 Ключове правило (дуже важливо)

👉 Жодного “розмитого” імплементу без артефактів

Кожен етап:

Research → артефакт → review → тільки потім implementation


⸻

📦 PM READY PACKAGE (на основі твоїх артефактів)

⸻

🟦 Sprint 1 — Runtime Stabilization & Observability Foundation

🎯 Мета

Зробити систему детермінованою, прозорою і дебажною

⸻

🧩 Epic 1 — Authoritative Runtime Timeline

Чому

Зараз:
	•	змішані повідомлення
	•	незрозуміло, що відбувається
	•	немає одного джерела істини

Що зробити

Створити єдиний runtime event timeline

Вимоги
	•	всі події = events (не текст)
	•	типи:
	•	agent.message
	•	system.thought
	•	swarm.handoff
	•	tool.call
	•	tool.result
	•	guard.retry
	•	run.start / run.end

UI
	•	chat = тільки user-visible messages
	•	timeline = окремий stream/debug view

Acceptance Criteria
	•	жодне повідомлення не є “змішаним”
	•	всі handoff видно як окремі events
	•	всі проміжні кроки можна побачити

⸻

🧩 Epic 2 — Prompt Tracing & Token Observability

Чому

Ти НЕ бачиш:
	•	що реально йде в LLM
	•	чому згорають токени

Що зробити
	•	логування prompt/response
	•	export/debug режим

Мінімум
	•	raw prompt
	•	model
	•	tokens in/out
	•	source (agent / system / retry)

Acceptance Criteria
	•	можна відкрити run і побачити всі prompt-и
	•	видно дублікати
	•	видно зайві виклики

⸻

🧩 Epic 3 — Guard & Loop Control

Чому
	•	зациклення
	•	повторні виклики
	•	витрата токенів
	•	stuck state

Що зробити
	•	bounded retries
	•	loop ceiling
	•	fail-fast

Acceptance Criteria
	•	жоден guard не крутиться нескінченно
	•	є max retry
	•	є лог loop причин

⸻

🧩 Epic 4 — Context Isolation Fixes

Чому
	•	відповідає на попереднє питання
	•	leakage

Що зробити
	•	чітке розділення:
	•	run context
	•	chain context
	•	project context

Acceptance Criteria
	•	нове повідомлення НЕ відповідає на старе
	•	немає cross-run contamination

⸻

🛑 STOP RULE

Після Sprint 1:
	•	НЕ робити нові фічі
	•	тільки перевірити:
	•	стабільність
	•	повторюваність
	•	логування

⸻

🟩 Sprint 2 — Execution Model Validation

🎯 Мета

Довести, що система працює так, як ти очікуєш

⸻

🧩 Epic 5 — Execution Modes Truth Table

Що зробити

Зробити truth table для режимів

Mode	Реально що відбувається


Acceptance
	•	чітке розуміння різниці
	•	документовано

⸻

🧩 Epic 6 — Handoff Verification System

Що зробити
	•	тест на 2–3 агенти
	•	підтвердження handoff

Acceptance
	•	видно реальний handoff
	•	не fake orchestration

⸻

🧩 Epic 7 — Parallel Execution Proof

Що зробити
	•	тест:
	•	2 задачі
	•	2 воркери
	•	перевірка concurrency

Acceptance
	•	доведено:
	•	є паралельність або її нема (і це задокументовано)

⸻

🧩 Epic 8 — Multi-message Stability Tests

Що зробити
	•	2, 3, 5 повідомлень
	•	перевірка:
	•	carryover
	•	stuck
	•	context

Acceptance
	•	стабільність підтверджена

⸻

🛑 STOP RULE

Після Sprint 2:
👉 ти маєш повністю розуміти, як працює система

⸻

🟨 Sprint 3 — Memory & Agent Model Hardening

🎯 Мета

Забезпечити ізоляцію і передбачуваність

⸻

🧩 Epic 9 — Memory Model Fix

Acceptance
	•	agent memory ≠ project memory
	•	isolation гарантована

⸻

🧩 Epic 10 — Agent Identity Model

Acceptance
	•	агент НЕ створюється заново без причини
	•	identity стабільний

⸻

🧩 Epic 11 — Project Isolation

Acceptance
	•	проєкти не течуть один в одного

⸻

🟪 Sprint 4 — PM Workflow & Automation (Ralf Vig Mode)

🎯 Мета

Реалізувати твій сценарій “я задав — система працює”

⸻

🧩 Epic 12 — Task Package Workflow

Acceptance
	•	можна:
	•	створити список задач
	•	вибрати частину
	•	підтвердити

⸻

🧩 Epic 13 — Task Execution Context Binding

Acceptance
	•	система працює тільки з selected tasks

⸻

🧩 Epic 14 — Verification Loop

Acceptance
	•	задача не просто “done”
	•	вона перевірена:
	•	pipeline
	•	агенти
	•	формат

⸻

🧩 Epic 15 — Verification Wrapper (Decoupled)

Acceptance
	•	НЕ зашито в agent files
	•	окремий layer

⸻

🟥 Sprint 5 — UX Parity with Codex

🎯 Мета

Зробити UX, як ти хочеш

⸻

🧩 Epic 16 — Live Thought Stream

Acceptance
	•	видно процес мислення

⸻

🧩 Epic 17 — Clickable Artifacts

Acceptance
	•	файли клікабельні
	•	тікети клікабельні

⸻

🧩 Epic 18 — Runtime Panel Upgrade

Acceptance
	•	видно:
	•	процеси
	•	статуси
	•	агенти

⸻

⚠️ Найважливіше (щоб не зламати все)

🔴 Заборонено:
	•	імплементувати все одразу
	•	змішувати спринти
	•	пропускати stop rules

⸻

📌 Як це тепер використовувати
	1.	Ти береш цей пакет → віддаєш PM
	2.	PM:
	•	створює sprint-и
	•	створює epics
	3.	Ми працюємо:
	•	Sprint 1 → перевірка → тільки потім далі

⸻
