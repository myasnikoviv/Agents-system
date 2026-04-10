🟦 Sprint 18 — Cockpit Observability & Control Layer

⸻

🎯 Sprint Goal

Перетворити Agent Cockpit з базового інтерфейсу (чат + статус агентів) у повноцінну операційну панель, яка:
	•	відображає реальний execution процес (не summary)
	•	дає повну прозорість:
	•	governance
	•	loops
	•	pipelines
	•	tools
	•	дозволяє дебажити, контролювати і аналізувати систему в runtime

⸻

🧠 Context

Після Sprint 0.5 → 11 система вже має:
	•	multi-agent execution engine
	•	governance engine (declarative rules + evaluators)
	•	loops (verification, improvement, retry)
	•	event bus
	•	workbench (частково)
	•	token tracking / routing

❗ Але:
	•	UI відображає лише:
	•	чат
	•	список агентів
	•	базовий runtime summary

⸻

⚠️ Problem Statement

Система зараз є black box:
	•	неможливо зрозуміти:
	•	що відбувається під капотом
	•	чому спрацював guard
	•	чому retry
	•	немає:
	•	timeline execution
	•	visualization loops
	•	governance trace
	•	planning visibility

👉 Це блокує:
	•	дебаг
	•	оптимізацію
	•	довіру до системи

⸻

🧩 Solution Overview

Створити Observability & Control Layer, який:

1. Відображає execution як процес
	•	timeline (як у Codex)
	•	handoff між агентами
	•	tool usage
	•	stages

⸻

2. Відображає governance
	•	rules
	•	evaluator results
	•	violations
	•	enforcement actions

⸻

3. Відображає loops
	•	verification loop
	•	improvement loop
	•	retry loop

⸻

4. Відображає planning layer
	•	execution plan (JSON)
	•	required:
	•	agents
	•	skills
	•	tools

⸻

5. Дає контроль
	•	debug mode
	•	доступ до prompt logs
	•	можливість аналізу run

⸻

🧱 Scope

✔️ Входить:
	•	execution timeline UI
	•	governance panel
	•	loops panel
	•	planning view
	•	tool usage panel
	•	token usage panel
	•	debug / raw logs mode

⸻

❌ НЕ входить:
	•	auto-optimization логіки
	•	зміна governance engine
	•	нові evaluator-и
	•	зміна runtime execution

👉 тільки visualization + control + observability

⸻

🧠 Key Principles

🔹 1. “Nothing hidden”

Кожен крок execution має бути видимий

⸻

🔹 2. “Deterministic truth first”

UI показує:
	•	events
	•	evaluator results
	•	artifacts

А не “думку LLM”

⸻

🔹 3. “Debuggable system”

Користувач може:
	•	зрозуміти причину
	•	знайти баг
	•	відтворити run

⸻

🔹 4. “Separation of concerns”

UI:
	•	не впливає на execution
	•	лише читає state

⸻

🧪 Success Criteria

Система вважається успішною, якщо:

⸻

✅ Execution видно повністю
	•	видно всі:
	•	агенти
	•	handoffs
	•	stages
	•	tools

⸻

✅ Governance прозорий
	•	видно:
	•	rule → evaluator → result → action

⸻

✅ Loops відображаються
	•	видно:
	•	коли loop спрацював
	•	скільки разів
	•	результат

⸻

✅ Planning видно
	•	видно execution plan
	•	видно, чи він дотриманий

⸻

✅ Debug можливий
	•	доступ до:
	•	raw prompts
	•	raw outputs
	•	LLM calls

⸻

✅ Cost видно
	•	tokens per run
	•	tokens per agent

⸻

📊 Expected Outcome

Після Sprint 18:

👉 Cockpit стає:
	•	не просто UI
	•	а операційною системою для агентів

⸻

🚀 Impact

До:
	•	black box
	•	складно дебажити
	•	складно довіряти

Після:
	•	прозора система
	•	контрольована
	•	дебажиться як реальний runtime

⸻

🧠 Strategic Value

Цей спринт:

👉 відкриває можливість:
	•	оптимізації cost
	•	tuning governance
	•	стабілізації системи

👉 і робить систему:
	•	реально production-ready
	•	а не “працює десь всередині”

⸻