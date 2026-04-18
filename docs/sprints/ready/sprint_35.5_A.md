🧠 Sprint 35.5A — UI System Integration (Design System Adoption)

🎯 Мета спринта

Імплементувати нову дизайн-систему (з V0 reference) у поточний продукт:
	•	привести ВСІ існуючі UI-компоненти до нового стилю
	•	зберегти логіку, state, routing, поведінку
	•	НЕ переписувати продукт, а замінити presentation layer

👉 Результат:

Поточний cockpit = виглядає як System Interface з лендингу (production-ready)

V0 reference: /Users/myasnikoviv/development/agent-system-landing

⸻

⚠️ Scope (дуже важливо)

Включено:
	•	рефактор UI компонентів
	•	заміна стилів
	•	уніфікація layout
	•	впровадження UI kit

НЕ включено:
	•	нові фічі
	•	зміна логіки
	•	зміна API
	•	зміна runtime

⸻

🧩 Основна ідея реалізації

👉 Ми НЕ копіюємо V0 код
👉 Ми робимо:

V0 Reference → Mapping → Existing Components → Refactor


⸻

🧱 Архітектурне рішення

1. Вводимо UI Kit Layer

Нова структура:

components/
  ui-kit/        ← NEW (source of truth)
  cockpit/
  auth/


⸻

2. Принцип

❌ було:

CockpitPage → кастомні div-и + стилі

✅ стане:

CockpitPage → UI Kit components


⸻

📦 Deliverables
	•	повністю оновлений UI
	•	уніфікований стиль
	•	всі екрани виглядають як одна система
	•	готова база для admin separation

⸻

🧱 Структура задач

⸻

🔹 EPIC 1 — UI Kit Integration Layer

TASK 1.1 — Створити ui-kit структуру

components/ui-kit/
  primitives/
  layout/
  data-display/
  feedback/


⸻

TASK 1.2 — Виділити базові компоненти

Реалізувати:
	•	Button (variants)
	•	Input (text, textarea)
	•	Dropdown
	•	Toggle
	•	Badge / Status
	•	IconButton

👉 IMPORTANT:
НЕ вигадувати → брати з V0 reference

⸻

TASK 1.3 — Layout components

Реалізувати:
	•	PageShell
	•	Sidebar
	•	Panel
	•	SectionHeader
	•	Toolbar

⸻

TASK 1.4 — System components

Реалізувати:
	•	StatCard
	•	ListRow
	•	EventLog
	•	ExecutionLog
	•	OutputPreview
	•	PipelineSteps

⸻

⸻

🔹 EPIC 2 — Cockpit Refactor

⸻

TASK 2.1 — Sidebar

Замінити:
	•	project list
	•	chain list
	•	actions

на:
	•	ui-kit ListRow
	•	ui-kit Sidebar layout

⸻

TASK 2.2 — Command Workspace

Замінити:
	•	input block
	•	pipeline block
	•	execution log
	•	output preview

на:
	•	ui-kit Input
	•	ui-kit PipelineSteps
	•	ui-kit ExecutionLog
	•	ui-kit OutputPreview

⸻

TASK 2.3 — Runtime Panel

Замінити:
	•	agents list
	•	queue stats
	•	event logs

на:
	•	ui-kit StatCard
	•	ui-kit ListRow
	•	ui-kit EventLog

⸻

⸻

🔹 EPIC 3 — Settings Page Refactor

⸻

TASK 3.1 — Layout
	•	розбити на section panels
	•	додати SectionHeader

⸻

TASK 3.2 — Controls

Замінити:
	•	select → Dropdown
	•	checkbox → Toggle
	•	input → ui-kit Input

⸻

TASK 3.3 — Structure

Уніфікувати:
	•	General
	•	Appearance
	•	Configuration
	•	Usage

⸻

⸻

🔹 EPIC 4 — Governance UI Refactor

⸻

TASK 4.1 — Rule Catalog
	•	список → ListRow / Table-like
	•	filters → Toolbar
	•	search → Input

⸻

TASK 4.2 — Rule Editor
	•	форма → Panel sections
	•	inputs → ui-kit

⸻

TASK 4.3 — Audit Trail
	•	events → EventLog / List
	•	expandable rows

⸻

TASK 4.4 — Overrides
	•	cards/list
	•	статуси
	•	metadata

⸻

⸻

🔹 EPIC 5 — Observability Refactor

⸻

TASK 5.1 — Metrics Panels
	•	cost
	•	usage
	•	queue

→ StatCard grid

⸻

TASK 5.2 — Logs
	•	LLM logs
	•	tool logs

→ EventLog

⸻

⸻

🔹 EPIC 6 — Auth UI Refactor

⸻

TASK 6.1 — Login Page

Переробити на:
	•	centered Panel
	•	ui-kit Input
	•	ui-kit Button

⸻

⸻

🔹 EPIC 7 — Global Consistency

⸻

TASK 7.1 — Typography
	•	прибрати хаотичні стилі
	•	уніфікувати

⸻

TASK 7.2 — Colors
	•	тільки системні кольори
	•	прибрати inline

⸻

TASK 7.3 — Spacing
	•	уніфікувати padding / gap

⸻

⸻

🔹 EPIC 8 — Cleanup

⸻

TASK 8.1 — Видалити старі стилі
	•	inline styles
	•	дублікати

⸻

TASK 8.2 — Replace everywhere
	•	пройти всі компоненти
	•	перевірити що НЕ лишилось старого UI

⸻

⸻

🧪 Acceptance Criteria

✔ Cockpit виглядає як System Interface
✔ Всі сторінки в одному стилі
✔ Немає старих компонентів
✔ UI kit використовується всюди
✔ Немає inline стилів
✔ Всі панелі, логі, списки — уніфіковані

⸻

🚨 Ризики
	1.	❌ Почнуть “трошки покращувати” дизайн
→ Заборонено
	2.	❌ Змішають старий і новий UI
→ Повний replace
	3.	❌ Поламають логіку
→ UI-only refactor

⸻

🔥 Ключова інструкція для агента

Use the V0 UI reference as a strict visual contract.
Do not redesign or reinterpret components.
Only map existing functionality to the new UI system.

⸻
