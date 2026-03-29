🔥 Фінальний спринт — це вже не про “як працює”, а про як це відчувається.
Тут ти перетворюєш систему в щось рівня Codex / Cursor / Claude Code UX — але з твоєю агентною логікою.

⸻

🟥 SPRINT 5 — UX Parity & Operator Experience (Codex-level Cockpit)

🎯 Мета

Зробити так, щоб:

👉 ти бачиш процес, а не результат
👉 ти керуєш системою як оператор, а не як юзер чату
👉 система виглядає як живий execution engine

⸻

⚠️ Принцип

👉 UI = проекція runtime, а не “чат”

👉 НЕ вигадуємо нову логіку
👉 тільки відображаємо те, що вже є (Sprint 1–4)

⸻

📦 Структура спринту (PM Ready)

⸻

🧩 EPIC 16 — Live Execution Stream (Thinking UI)

⸻

🔧 Problem

Зараз:
	•	ти бачиш тільки фінальну відповідь
	•	немає “thinking stream”
	•	немає відчуття процесу

⸻

🎯 Goal

👉 UI як у Codex:
	•	live stream
	•	крок за кроком
	•	видно execution

⸻

🧱 Task 16.1 — Stream Renderer

Відображає events:
	•	system.thought
	•	tool.call
	•	swarm.handoff
	•	agent.started

⸻

🧱 Task 16.2 — Message Types UI

Кожен event → свій стиль:

Event	UI
thought	сірий
agent.message	норм
handoff	badge
tool	технічний блок


⸻

🧱 Task 16.3 — Progressive Rendering

👉 НЕ чекати фінал
	•	показувати одразу
	•	стрімити

⸻

🧱 Task 16.4 — Collapse/Expand
	•	thought → collapsed
	•	можна розгорнути

⸻

✅ Acceptance
	•	видно процес у реальному часі
	•	не тільки результат

⸻

⸻

🧩 EPIC 17 — Clickable Artifacts (Codex UX)

⸻

🔧 Problem
	•	текст не інтерактивний
	•	не можна перейти до файлу / тікета

⸻

🎯 Goal

👉 зробити UI як IDE

⸻

🧱 Task 17.1 — Artifact Parser

Парсити:
	•	файли
	•	тікети
	•	команди
	•	tools

⸻

🧱 Task 17.2 — Click Actions

Тип	Дія
файл	відкрити
ticket	перейти
tool	показати


⸻

🧱 Task 17.3 — Highlighting

+ src/runtime/Agent.ts


⸻

🧱 Task 17.4 — Tool Panels
	•	показати:
	•	stdout
	•	результат

⸻

✅ Acceptance
	•	можна клікати:
	•	файл
	•	тікет
	•	команду

⸻

⸻

🧩 EPIC 18 — Runtime Control Panel (Operator Mode)

⸻

🔧 Problem

Зараз:
	•	ти не бачиш:
	•	процеси
	•	агенти
	•	навантаження

⸻

🎯 Goal

👉 ти = оператор системи

⸻

🧱 Task 18.1 — Active Agents Panel

Показує:
	•	agent
	•	статус
	•	activity

⸻

🧱 Task 18.2 — Process Tracker

Показує:
	•	run
	•	tasks
	•	статус

⸻

🧱 Task 18.3 — Mode Indicator

Mode: multiple_agents


⸻

🧱 Task 18.4 — Health Indicators
	•	зелений = працює
	•	червоний = помилка

⸻

🧱 Task 18.5 — Live Counters
	•	active runs
	•	llm calls
	•	retries

⸻

✅ Acceptance
	•	видно систему як процес
	•	не як чат

⸻

⸻

🧩 EPIC 19 — Project & Chain Navigation (Codex Structure)

⸻

🔧 Problem
	•	плоска структура
	•	немає організації

⸻

🎯 Goal

👉 структура:

Project
  └── Chains
        └── Messages


⸻

🧱 Task 19.1 — Project Selector
	•	вибір project
	•	підгрузка контексту

⸻

🧱 Task 19.2 — Chain List
	•	список чатів
	•	history

⸻

🧱 Task 19.3 — Persistent History
	•	збереження
	•	reload

⸻

🧱 Task 19.4 — Chain Context
	•	кожен chain = окремий контекст

⸻

✅ Acceptance
	•	як у ChatGPT / Codex
	•	але з проектами

⸻

⸻

🧩 EPIC 20 — Debug & Developer Mode

⸻

🔧 Problem
	•	немає deep debug
	•	складно аналізувати

⸻

🎯 Goal

👉 режим “інженера”

⸻

🧱 Task 20.1 — Debug Toggle

Debug Mode: ON


⸻

🧱 Task 20.2 — Prompt Viewer
	•	показати prompt
	•	показати response

⸻

🧱 Task 20.3 — Event Inspector
	•	всі events
	•	raw JSON

⸻

🧱 Task 20.4 — Export Run
	•	JSON export

⸻

🧱 Task 20.5 — Token Stats
	•	tokens per run
	•	per agent

⸻

✅ Acceptance
	•	можна дебажити систему
	•	не guessing

⸻

⸻

🧪 TEST SUITE (SPRINT 5)

⸻

Test 16 — Live stream

✔ видно process

⸻

Test 17 — Clickable

✔ файл відкривається

⸻

Test 18 — Panel

✔ видно агентів

⸻

Test 19 — Navigation

✔ history працює

⸻

Test 20 — Debug

✔ видно prompt

⸻

⸻

🛑 STOP CONDITION

Після Sprint 5:

✔ UX = рівень Codex
✔ видно execution
✔ система керована

⸻

⚠️ ВАЖЛИВО

👉 Це НЕ нова логіка
👉 Це відображення

⸻

🧠 Результат після всіх 5 спринтів

Ти отримуєш:

👉 систему, де:
	•	є runtime engine
	•	є ізоляція
	•	є перевірка
	•	є автономність
	•	є UX

⸻

🚀 Якщо хочеш максимум

Наступний рівень (після цього):

👉 Sprint 6 (не обов’язково):
	•	performance
	•	cost optimization
	•	caching
	•	learning loops

⸻
