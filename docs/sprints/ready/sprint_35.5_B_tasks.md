🟪 Sprint 35.5B — Tasks (Client/Admin Separation)

⸻

🔷 EPIC 1 — UI Ownership Separation

🎯 Ціль

Чітко визначити: що належить cockpit (client), а що — admin/platform.

⸻

TASK 1.1 — Inventory існуючих сторінок

Зробити список:

Client-кандидати:
	•	CockpitPage
	•	Sidebar (projects/chains)
	•	Command Interface
	•	Execution logs/output
	•	Chat / chains

Admin-кандидати:
	•	GovernanceCenterPage
	•	GovernanceRuleCatalog
	•	GovernanceRuleEditor
	•	ProjectPolicyManager
	•	ManualOverrideManager
	•	EvidenceOverrideManager
	•	GovernanceAuditTrail
	•	Observability panels

👉 Результат:
	•	markdown або JSON mapping:

{
  "client": [...],
  "admin": [...]
}


⸻

TASK 1.2 — Позначити ownership у коді

Для кожної сторінки:
	•	додати meta:

ownership: 'client' | 'admin'

👉 Це буде корисно далі для routing і guards.

⸻

🔷 EPIC 2 — Client App Cleanup

🎯 Ціль

Зробити cockpit чистим user-facing інтерфейсом.

⸻

TASK 2.1 — Видалити governance з cockpit

Прибрати з client-app:
	•	GovernanceCenter
	•	Rule editing UI
	•	Policy UI
	•	Overrides UI
	•	Audit UI

❗ НЕ видаляти код повністю — тільки винести

⸻

TASK 2.2 — Видалити observability з cockpit

Прибрати:
	•	monitoring panels
	•	cost metrics
	•	system logs (не execution logs!)

👉 залишити тільки:
	•	execution logs (user tasks)

⸻

TASK 2.3 — Очистити navigation

Sidebar / navigation:

Було:

Cockpit
Governance
Monitoring

Стало:

Projects
Chains
Tasks


⸻

🔷 EPIC 3 — Admin / Platform UI Activation

🎯 Ціль

Зробити окремий system-level інтерфейс

⸻

TASK 3.1 — Створити admin surface

Використати існуючий app (колишній control-plane):

👉 або:

apps/admin-app

👉 або rename:

apps/platform-console


⸻

TASK 3.2 — Admin layout

Створити layout:

Sidebar:
	•	Governance
	•	Policies
	•	Overrides
	•	Audit
	•	Monitoring

Main panel:
	•	content area

⸻

TASK 3.3 — Перенести сторінки

Перенести всі admin-компоненти з client → admin:
	•	governance pages
	•	policy pages
	•	audit
	•	observability

❗ Важливо:
	•	не копіювати
	•	саме перемістити

⸻

🔷 EPIC 4 — Routing Separation

🎯 Ціль

Розділити URL-простір

⸻

TASK 4.1 — Client routing

/
/login
/cockpit


⸻

TASK 4.2 — Admin routing

/admin
/admin/governance
/admin/policies
/admin/overrides
/admin/audit
/admin/monitoring


⸻

TASK 4.3 — Remove mixed routes

❌ Видалити:

/cockpit/governance
/cockpit/monitoring


⸻

🔷 EPIC 5 — Access Control

🎯 Ціль

Реальне розділення доступів, а не тільки UI hide

⸻

TASK 5.1 — Route guards

Client:
	•	доступ для всіх

Admin:
	•	тільки admin/owner

⸻

TASK 5.2 — Redirect logic
	•	user → не може зайти в /admin
	•	admin → може зайти в обидва

⸻

TASK 5.3 — Fallback
	•	якщо user заходить в /admin:
→ redirect /cockpit

⸻

🔷 EPIC 6 — Deployment / Entry Points

🎯 Ціль

Підготувати до реального розділення (навіть якщо локально)

⸻

TASK 6.1 — Separate start scripts

npm run start:client
npm run start:admin


⸻

TASK 6.2 — Env separation

CLIENT_URL=
ADMIN_URL=


⸻

TASK 6.3 — Dev ports

localhost:3000 → client
localhost:3001 → admin


⸻

🔷 EPIC 7 — Shared UI Kit Integration

🎯 Ціль

Уникнути дублювання UI

⸻

TASK 7.1 — Використати UI kit
	•	всі кнопки
	•	layout
	•	cards
	•	forms

👉 з packages/ui-kit

⸻

TASK 7.2 — Заборонити локальні стилі

❌ не створювати дублікати компонентів
✅ використовувати shared

⸻

🔷 EPIC 8 — Generated Layer Compatibility

(дуже важливий твій контекст)

⸻

TASK 8.1 — Перевірити, що нічого не зламали
	•	agent execution працює
	•	Generated/ не змінювався
	•	links з agent-файлів працюють

⸻

TASK 8.2 — Заборонити admin logic у Generated

❗ Generated НЕ повинен:
	•	містити admin UI
	•	містити governance UI

⸻

🔷 EPIC 9 — UX Cleanup

⸻

TASK 9.1 — Cockpit спрощення

Залишити тільки:
	•	задачі
	•	агенти
	•	execution
	•	результати

⸻

TASK 9.2 — Admin як “control room”

Зробити:
	•	більш технічний UI
	•	більше таблиць
	•	більше логів
	•	менше “product vibe”

⸻

🧪 Acceptance Criteria

✔ Cockpit не містить governance
✔ Cockpit не містить monitoring
✔ Admin містить всі system-level функції
✔ Routing розділений
✔ Role-based доступ працює
✔ Нема змішаних сторінок
✔ UI kit використовується обома apps
✔ Generated layer не зачеплений

⸻

🚨 Анти-патерни (дуже важливо)

❌ не створювати нові apps з нуля
❌ не дублювати компоненти
❌ не робити “прихований admin” в cockpit
❌ не чіпати backend logic

⸻

🧠 Підсумок

Цей спринт:
	•	НЕ про архітектуру
	•	НЕ про бекенд
	•	НЕ про нові сервіси

👉 Це:

“зробити так, щоб система виглядала так, як вона вже спроектована”
