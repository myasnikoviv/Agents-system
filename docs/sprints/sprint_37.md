🧠 Sprint 37 — Architecture Refactor & Repository Topology Foundation

⸻

🎯 1. Мета спринта

Спринт 37 має одну чітку мету:

Перетворити систему з “логічно модульної, але фізично монолітної” у структуровано декомпозовану платформу, готову до масштабування, SaaS та розділення на незалежні deploy units.

⸻

🔥 2. Чому цей спринт критичний

На поточний момент система:
	•	логічно вже має:
	•	control plane
	•	runtime
	•	governance
	•	billing
	•	memory
	•	але фізично:
	•	живе в одному repo
	•	збирається як один сервіс
	•	деплоїться як один блок

👉 Це створює ключові обмеження:

❌ Проблеми
	•	неможливо масштабувати окремі частини
	•	будь-яка зміна → rebuild всього
	•	неможливо зробити clean SaaS separation
	•	складно контролювати залежності
	•	важко підтримувати та розвивати

⸻

🧠 3. Основна ідея спринта

Не створювати мікросервіси одразу, а зробити систему “готовою до них”

Це означає:
	•	чітко визначити boundaries
	•	фізично рознести код
	•	стандартизувати взаємодію
	•	зберегти monorepo (поки)

⸻

🧱 4. Що ми будуємо в цьому спринті

⸻

🔹 4.1 Repository Topology

Ми вводимо нову структуру:

apps/
  client-app
  control-plane

packages/
  runtime
  governance
  billing
  memory
  shared

👉 Це НЕ microservices
👉 Це multi-package monorepo

⸻

🔹 4.2 Service Boundaries

Ми фіксуємо:

Домен	Відповідальність
runtime	execution, agents, pipelines
control plane	orchestration, API, routing
governance	rules, loops, validation
billing	usage, quotas, cost
memory	storage abstraction
shared	types, utils, contracts

👉 Вперше з’являються чіткі межі

⸻

🔹 4.3 Backend Decomposition

Найкритичніший крок:

👉 розбити:

agentSystemBackend.ts

на:
	•	API layer
	•	runtime adapter
	•	governance adapter
	•	billing adapter
	•	memory adapter

⸻

🔹 4.4 Build & Docker Isolation

Зараз:
	•	весь repo копіюється
	•	всі сервіси збираються разом

Після спринта:
	•	кожен app має свій build context
	•	Docker не копіює весь repo
	•	з’являється можливість selective builds

⸻

🔹 4.5 Data Ownership

Вводимо принцип:

Кожен домен володіє своїми даними

⸻

Це означає:
	•	runtime → execution data
	•	control plane → config + orchestration
	•	governance → rules + policies
	•	billing → usage + limits

👉 припиняємо shared DB хаос

⸻

🔹 4.6 Shared Contracts

Вводимо:
	•	shared types
	•	API contracts
	•	domain interfaces

👉 замість:

import from ../../../../runtime/whatever


⸻

🔹 4.7 Runtime Isolation (foundation)

Ми не робимо ще повний distributed runtime, але:
	•	готуємо runtime як окремий пакет
	•	ізолюємо execution logic
	•	готуємо до окремого deploy

⸻

⚙️ 5. Що НЕ робиться в цьому спринті

Щоб не зламати систему:

❌ не робимо microservices
❌ не міняємо бізнес-логіку
❌ не міняємо API контракти
❌ не робимо UI split (повноцінний)
❌ не робимо Kubernetes / infra

⸻

🧠 6. Принципи спринта

⸻

🔹 6.1 No behavior change

Рефактор ≠ нова логіка

⸻

🔹 6.2 Physical mirrors logical

repo має відображати архітектуру

⸻

🔹 6.3 Isolation over optimization

краще більше меж, ніж менше

⸻

🔹 6.4 Prepare, not overengineer

ми готуємо до microservices, але не робимо їх

⸻

🧪 7. Очікуваний результат

Після спринта система стає:

⸻

✅ Структурно зрозумілою
	•	видно де runtime
	•	видно де control plane
	•	видно де shared

⸻

✅ Готовою до scaling
	•	можна ізолювати runtime
	•	можна масштабувати частини

⸻

✅ Готовою до SaaS
	•	можна вводити multi-tenant boundaries
	•	можна розділяти control/client

⸻

✅ Готовою до наступних спринтів
	•	35.5B (UI separation)
	•	36 (Product Layer)
	•	30+ (distributed runtime)

⸻

🚨 8. Основні ризики

⸻

❌ 1. Недорозділення

→ залишиться той самий моноліт, але в інших папках

⸻

❌ 2. Overengineering

→ занадто рано зробити microservices

⸻

❌ 3. Breaking changes

→ зламати runtime або API

⸻

❌ 4. Dependency chaos

→ циклічні імпорти між пакетами

⸻

🧠 9. Як цей спринт пов’язаний з іншими

⸻

🔗 Після 35.5A (UI system)

✔ UI вже уніфікований

⸻

🔗 Перед 35.5B (UI split)

👉 дає можливість зробити split правильно

⸻

🔗 Перед Sprint 36 (Product Layer)

👉 дає основу для teams / roles / workspaces

⸻

🔗 Перед SaaS

👉 вводить deploy-ready структуру

⸻

🧠 10. Ключова думка

Це не “рефактор коду”.
Це момент, коли система переходить з “прототипа” в “платформу”.

⸻

Якщо коротко:

👉 До 37 — у вас складний код
👉 Після 37 — у вас архітектура

⸻