🟪 Sprint 35.5B — Client/Admin Interface Separation & Deployment Activation

1. Контекст

Після Sprint 37 система вже має нову фізичну основу:
	•	apps/client-app
	•	окремий platform/control app
	•	окремий runtime app
	•	shared packages
	•	розділені deploy units на рівні архітектури.

Тобто основна задача вже не в тому, щоб “створити окремі apps”, а в тому, щоб:
	•	правильно активувати client/admin split
	•	винести system-level UI з cockpit
	•	завершити routing/access separation
	•	підготувати окремі entry points для користувацького і platform UI

⸻

2. Мета спринта

👉 Розділити користувацький продуктовий інтерфейс і platform/admin інтерфейс на рівні:
	•	routing
	•	navigation
	•	access
	•	page ownership
	•	deployment entry points

без повторного backend decomposition.

⸻

3. Головний результат

Після спринта система має мати два окремі UI-контури:

Client Interface

Для кінцевої роботи користувача:
	•	проєкти
	•	chain/chat navigation
	•	command interface
	•	execution
	•	outputs

Admin / Platform Interface

Для platform/system-level управління:
	•	governance
	•	policies
	•	overrides
	•	audit trail
	•	observability / monitoring
	•	owner/admin tools

⸻

4. Що змінюється від старої версії 35.5B

Було
	•	створити client-app
	•	створити admin-app
	•	рознести фронтенд

Стало
	•	client-app уже існує — його не створюємо заново.
	•	замість “створити app split”:
	•	закріплюємо UI ownership
	•	виносимо admin/system screens із cockpit
	•	активуємо окремий admin/platform entry point
	•	формуємо правильні URL / dev entry / deploy contracts

⸻

5. Scope

5.1 Входить

Client surface

Залишаємо в cockpit/client:
	•	CockpitPage
	•	sidebar with projects/chains
	•	command interface
	•	execution stream/logs
	•	artifact/output rendering
	•	user-facing settings only

Admin / Platform surface

Виносимо в окремий admin/platform UI:
	•	GovernanceCenterPage
	•	GovernanceRuleCatalog
	•	GovernanceRuleEditor
	•	ProjectPolicyManager
	•	ManualOverrideManager
	•	EvidenceOverrideManager
	•	GovernanceAuditTrail
	•	ObservabilityPanels

Ці компоненти вже сьогодні сидять у client-app і змішують system-level UX із cockpit UX.  ￼

⸻

5.2 Не входить
	•	новий backend split
	•	нові microservices
	•	новий repo refactor
	•	product layer (teams / roles / missions)
	•	billing/tenant expansion
	•	нова дизайн-система з нуля

⸻

6. Основна ідея спринта

Після 37-го спринта структура вже дозволяє зробити це правильно.

Тому 35.5B тепер — це не архітектурний re-foundation, а:

UI/domain activation sprint

Ми беремо вже розділену platform topology і доводимо до продуктового стану:
	•	client = робочий cockpit
	•	admin/platform = system console

⸻

7. Нове архітектурне рішення

7.1 Client App

apps/client-app стає чистим cockpit surface:

Включає
	•	login
	•	project navigation
	•	command execution
	•	outputs
	•	chat/chains
	•	minimal user settings

Не включає
	•	governance editing
	•	policy authoring
	•	audit
	•	observability
	•	owner/system monitoring

⸻

7.2 Admin / Platform App

Поточний platform/control application стає admin console.

Тут важливий коментар:
назва control-plane після 37.5, ймовірно, має бути замінена на щось на кшталт:
	•	platform-api
	•	platform-console
	•	admin-console

щоб не конфліктувати з Plane ticket system. Це вже підсвічено як remediation item після 37.5.  ￼

⸻

7.3 Shared UI

UI kit із 35.5A лишається shared:
	•	primitives
	•	shells
	•	cards
	•	forms
	•	status blocks

Тобто 35.5B не дублює UI, а розводить ownership screens.

⸻

8. Routing Model

Client routing

Очікувані маршрути:
	•	/
	•	/login
	•	/cockpit
	•	/cockpit/settings — тільки user-facing settings

Admin routing

Очікувані маршрути:
	•	/admin
	•	/admin/governance
	•	/admin/policies
	•	/admin/overrides
	•	/admin/audit
	•	/admin/monitoring

Критично

Потрібно прибрати змішаний шлях типу:
	•	/cockpit/governance

Бо це і є джерело змішання UX-моделей. Старий 35.5B це правильно ловив, просто тепер це вже не про app creation, а про cleanup and activation.  ￼

⸻

9. Access Model

User
	•	має доступ тільки до client surface

Admin
	•	має доступ до client + admin

Owner
	•	має повний доступ

Важливо

Role-based UI hidden state більше не достатньо.
Тепер потрібне:
	•	route-level separation
	•	app-level separation
	•	clear navigation boundaries

⸻

10. UX Goal

Після спринта:

Cockpit

має стати простішим і чистішим:
	•	жодного governance overload
	•	жодного monitoring overload
	•	жодної системної адмінки всередині продуктового робочого простору

Admin Console

має стати окремим контуром:
	•	governance
	•	policies
	•	audit
	•	overrides
	•	observability
	•	system-level control

⸻

11. Чому цей спринт важливий саме зараз

Бо після Sprint 37/37.5 у вас уже є фізична основа, але продуктово/UI:
	•	користувацький cockpit
	•	admin/system tools

все ще змішані в одному контурі.

Тобто саме цей спринт робить platform shape видимим для користувача.

⸻

12. Acceptance Criteria

Спринт вважається завершеним, якщо:
	•	cockpit/client більше не містить governance center
	•	cockpit/client більше не містить observability/monitoring panels
	•	admin/platform surface містить усі system-level screens
	•	routing client/admin розділений
	•	user не бачить admin routes
	•	admin/owner мають доступ до обох поверхонь
	•	UI kit shared, але page ownership не змішується
	•	deploy/start contracts для client та admin UI окремі

⸻

13. Що буде fail

Спринт не можна вважати успішним, якщо:
	•	governance все ще живе всередині cockpit navigation
	•	observability лишається в користувацькому UI
	•	route guards лишилися єдиним способом “розділення”
	•	admin surface фактично не окремий, а просто приховані вкладки
	•	app boundaries після 37 не були використані, а тільки імітовані

⸻

14. Підсумок

До 35.5B
	•	architecture уже розділена
	•	UX ще змішаний

Після 35.5B
	•	architecture і UX нарешті співпадають

І тільки після цього вже дуже логічно заходити в:
	•	Sprint 36 — Product Layer
бо тоді cockpit буде чистим user-facing продуктом, а не сумішшю user+platform поверхонь.

⸻

15. Практичний коментар

Тобто відповідь на твоє питання:

так, файл 35.5B можна тепер віддавати, але тільки в цій переписаній версії, post-37
— де він вже не “розносить сервіси”, а
активує client/admin separation на базі вже готової topology.
