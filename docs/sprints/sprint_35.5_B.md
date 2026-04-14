🧠 Sprint 35.5B — Interface Separation (Client vs Control Plane)

🎯 Мета спринта

Розділити систему на два незалежні UI-контури:
	1.	Client Interface (Cockpit)
	2.	Control Plane (Admin / System layer)

👉 з окремими:
	•	entry points
	•	routing
	•	доступами
	•	UI-контекстами

⸻

🔥 Головний результат

Після спринта:

app.domain.com          → Client Interface (Cockpit)
admin.domain.com        → Control Plane (Admin)

Або локально:

localhost:3000          → Client
localhost:3001          → Admin


⸻

❗ Проблема зараз

Зараз у тебе:
	•	cockpit + governance + monitoring = в одному UI
	•	доступ через roles (admin/owner)
	•	але UX:
	•	перевантажений
	•	не масштабований
	•	не SaaS-ready

⸻

🧩 Що саме ми будуємо

2 незалежні системи

⸻

🔵 1. Client Interface (Cockpit)

Призначення:

Робота з задачами, агентами, проєктами

Включає:
	•	CockpitPage
	•	Sidebar (projects/chats)
	•	Command Interface
	•	Execution / logs / output

НЕ включає:
	•	governance editing
	•	audit
	•	system config
	•	monitoring

⸻

🔴 2. Control Plane (Admin)

Призначення:

Управління системою, політиками, моніторинг

Включає:
	•	Governance Center
	•	Rule Catalog
	•	Policy Manager
	•	Overrides
	•	Audit Trail
	•	Observability

⸻

🧱 Архітектурне рішення

⸻

1. Розділення фронтенду

Варіант (рекомендований):

apps/
  client-app/
  admin-app/


⸻

2. Спільна бібліотека

packages/
  ui-kit/
  shared/

👉 UI kit з 35.5A → сюди

⸻

3. Routing separation

Client:

/
 /login
 /cockpit

Admin:

/admin
/admin/governance
/admin/monitoring


⸻

4. Auth / Roles

Ролі:
	•	user → тільки client
	•	admin → client + admin
	•	owner → full access

⸻

📦 EPIC breakdown

⸻

🔹 EPIC 1 — App Split

⸻

TASK 1.1 — Створити client-app
	•	винести cockpit
	•	окремий entry point

⸻

TASK 1.2 — Створити admin-app
	•	винести:
	•	Governance
	•	Observability
	•	Policy

⸻

TASK 1.3 — Shared packages
	•	ui-kit → shared
	•	types → shared
	•	utils → shared

⸻

⸻

🔹 EPIC 2 — Routing Separation

⸻

TASK 2.1 — Client routing

/login
/cockpit


⸻

TASK 2.2 — Admin routing

/admin
/admin/governance
/admin/monitoring


⸻

TASK 2.3 — Remove mixed routes

❌ було:

/cockpit/governance

✅ стало:

/admin/governance


⸻

⸻

🔹 EPIC 3 — UI Separation

⸻

TASK 3.1 — Видалити governance з cockpit

З Cockpit прибрати:
	•	governance tabs
	•	audit
	•	overrides
	•	policy UI

⸻

TASK 3.2 — Видалити observability з cockpit
	•	metrics
	•	cost
	•	logs

⸻

⸻

🔹 EPIC 4 — Admin UI Structure

⸻

TASK 4.1 — Admin layout

Новий layout:
	•	sidebar:
	•	Governance
	•	Monitoring
	•	Policies
	•	main panel

⸻

TASK 4.2 — Admin navigation

Tabs/pages:
	•	Rule Catalog
	•	Project Policy
	•	Overrides
	•	Audit Trail
	•	Monitoring

⸻

⸻

🔹 EPIC 5 — Access Control

⸻

TASK 5.1 — Route guards
	•	client → всі юзери
	•	admin → тільки admin/owner

⸻

TASK 5.2 — Redirect logic
	•	user → не бачить admin
	•	admin → може заходити в обидва

⸻

⸻

🔹 EPIC 6 — Environment / Deployment

⸻

TASK 6.1 — Separate builds
	•	client build
	•	admin build

⸻

TASK 6.2 — Env config

CLIENT_URL
ADMIN_URL


⸻

⸻

🔹 EPIC 7 — UX Cleanup

⸻

TASK 7.1 — Прибрати перевантаження cockpit

Залишити тільки:
	•	task execution
	•	project navigation

⸻

TASK 7.2 — Admin = системний UI
	•	більш “control plane”
	•	більше таблиць, логів, політик

⸻

⸻

🧪 Acceptance Criteria

✔ Cockpit не містить governance
✔ Cockpit не містить monitoring
✔ Admin має всі system-level функції
✔ UI не змішується
✔ routing розділений
✔ ролі працюють

⸻

🚨 Ризики

⸻

❌ 1. Часткове розділення

→ найгірший сценарій
→ система стане ще складнішою

⸻

❌ 2. Дублювання компонентів

→ вирішується через ui-kit

⸻

❌ 3. Змішання логіки

→ UI split ≠ backend split (поки що)

⸻

🧠 Важливий принцип

Це UI separation, не backend split

Backend:
	•	поки може залишатися спільним

⸻

🔥 Результат після 35.5B

У тебе з’являється:

✅ SaaS-ready структура
	•	зрозумілий UX
	•	масштабованість
	•	clean separation

⸻