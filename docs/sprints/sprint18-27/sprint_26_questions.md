Супер. Це якраз той спринт, де дуже легко “зробити вигляд multi-user системи”, але реально лишитися single-user з auth зверху.

Тому нижче даю жорсткий Validation Pack для Sprint 26, який перевіряє:

❗ чи у вас з’явився справжній user-scoped runtime + on-demand environments,
а не просто “додали логін”.

⸻

🟪 SPRINT 26 — FINAL VALIDATION PACK (Multi-User & On-Demand Runtime)

⸻

🎯 Ціль перевірки

Підтвердити, що система:
	•	стала multi-user aware
	•	має environment як runtime-сутність
	•	підтримує on-demand provisioning
	•	має ізоляцію по user/tenant/workspace
	•	і при цьому:
	•	працює локально
	•	готова до cloud

⸻

🟫 SECTION 1 — Authentication & Identity

⸻

1.1 Чи auth реально працює, а не “заглушка”?

Перевірити:
	•	user може зареєструватись/залогінитись
	•	identity передається в backend
	•	protected endpoints без auth недоступні

⸻

1.2 Чи всі дії прив’язані до user?

Перевірити:
	•	створення project
	•	запуск задач
	•	управління environment

Очікування:
	•	кожна дія має userId / tenantId / workspaceId
	•	немає “анонімних” runtime дій

⸻

1.3 Чи user isolation enforced?

Сценарій:
	•	user A
	•	user B

Очікування:
	•	user A не бачить проекти user B
	•	доступ не можна отримати через прямий API виклик

⸻

🟫 SECTION 2 — Workspace / Tenant Model

⸻

2.1 Чи існує повна ієрархія?
	•	tenant
	•	workspace
	•	project
	•	environment

⸻

2.2 Чи workspace context обов’язковий?

Перевірити:
	•	неможливо виконати runtime дію без workspace context
	•	context передається в runtime/router

⸻

2.3 Чи isolation не логічний, а технічний?

Очікування:
	•	isolation enforced через namespace/storage keys
	•	не залежить від “ми не переплутаємо”

⸻

🟫 SECTION 3 — Environment Model

⸻

3.1 Чи environment — це реальна сутність?
	•	має ID
	•	має lifecycle state
	•	зберігається поза RAM
	•	доступний через API

⸻

3.2 Чи lifecycle реально працює?

Перевірити переходи:
	•	provisioning
	•	warming
	•	active
	•	idle
	•	suspended
	•	terminated
	•	failed

Очікування:
	•	transitions відбуваються
	•	transitions логуються

⸻

3.3 Чи environment переживає restart?

Сценарій:
	•	створити environment
	•	перезапустити систему

Очікування:
	•	environment відновлюється
	•	state не губиться

⸻

🟫 SECTION 4 — On-Demand Provisioning

⸻

4.1 Чи environment створюється on-demand?

Сценарій:
	•	новий user → відкриває workspace

Очікування:
	•	environment створюється автоматично або через API
	•	є статус “provisioning”

⸻

4.2 Чи provisioning idempotent?
	•	повторний виклик не створює дублікати
	•	state коректний

⸻

4.3 Чи warmup реально працює?
	•	environment переходить у warming
	•	runtime dependencies ініціалізуються
	•	latency першого запиту менша після warmup

⸻

4.4 Чи suspend/resume працює?

Сценарій:
	•	idle → suspend → resume

Очікування:
	•	environment відновлюється
	•	state не ламається

⸻

🟫 SECTION 5 — User-Scoped Workers

⸻

5.1 Чи workers прив’язані до environment?
	•	worker має environmentId
	•	worker не бере чужі задачі

⸻

5.2 Чи worker isolation реальний?

Сценарій:
	•	2 users
	•	2 environments

Очікування:
	•	worker A не виконує задачі environment B

⸻

5.3 Чи worker lifecycle visible?
	•	worker state видно
	•	worker activity логиться

⸻

🟫 SECTION 6 — Environment-Scoped Queue

⸻

6.1 Чи queue scoped to environment?
	•	queue namespace включає environmentId
	•	tasks не змішуються

⸻

6.2 Чи немає leakage?

Сценарій:
	•	user A task
	•	user B task

Очікування:
	•	tasks не перетинаються

⸻

6.3 Чи queue працює з кількома environments одночасно?
	•	multiple environments → multiple queues або namespace
	•	dispatch коректний

⸻

🟫 SECTION 7 — Memory / Artifact Isolation

⸻

7.1 Чи memory scoped?
	•	tenant + workspace + environment + agent

⸻

7.2 Чи artifacts scoped?
	•	artifact storage не змішується

⸻

7.3 Чи telemetry scoped?
	•	logs / traces відносяться до конкретного environment

⸻

❗ КРИТИЧНЕ
	•	жоден user не бачить чужі дані навіть випадково

⸻

🟫 SECTION 8 — Hot / Cold Runtime Strategy

⸻

8.1 Чи всі агенти НЕ стартують одразу?
	•	eager startup відсутній
	•	частина агентів cold

⸻

8.2 Чи cold агенти піднімаються on-demand?
	•	при першому виклику
	•	без падіння runtime

⸻

8.3 Чи є idle demotion?
	•	hot → standby → cold
	•	працює по таймеру/pressure

⸻

8.4 Чи це дає реальний ефект?
	•	менше використання ресурсів
	•	telemetry це підтверджує

⸻

🟫 SECTION 9 — Deployment Portability

⸻

9.1 Чи система працює локально?
	•	один user
	•	повний runtime

⸻

9.2 Чи існує cloud profile?
	•	config-based
	•	не потребує переписування коду

⸻

9.3 Чи infra abstraction працює?
	•	storage abstraction
	•	queue abstraction
	•	secrets abstraction

⸻

❗ КРИТИЧНЕ
	•	немає прямої залежності від локального FS у runtime

⸻

🟫 SECTION 10 — Containerization

⸻

10.1 Чи система запускається через Docker?
	•	backend container
	•	runtime container

⸻

10.2 Чи build reproducible?
	•	однаковий результат на різних машинах

⸻

10.3 Чи можна підняти систему “з нуля”?
	•	без ручних кроків
	•	тільки через config

⸻

🟫 SECTION 11 — Environment Control API

⸻

11.1 Чи є API для environment?
	•	get status
	•	provision
	•	suspend
	•	resume

⸻

11.2 Чи статус правдивий?
	•	не “симуляція”
	•	відповідає реальному runtime

⸻

🟫 SECTION 12 — Multi-User Reality Check

⸻

12.1 Сценарій: 2 users
	•	створити user A
	•	створити user B

Очікування:
	•	2 environments
	•	незалежні worker pools
	•	незалежні queues
	•	незалежні memory/artifacts

⸻

12.2 Сценарій: load
	•	кілька users одночасно

Очікування:
	•	система не деградує
	•	немає cross-user interference

⸻

🟫 SECTION 13 — Final Truth Questions

⸻

❗ Питання 1
	•	Чи user тепер є повноцінною runtime-одиницею, а не просто записом у БД?

⸻

❗ Питання 2
	•	Чи environment реально існує і керує execution?

⸻

❗ Питання 3
	•	Чи можна підняти 10 users без переписування системи?

⸻

❗ Питання 4
	•	Чи система не залежить від того, що “всі працюють в одному процесі”?

⸻

❗ Питання 5
	•	Чи ця система вже може бути основою SaaS без redesign?

⸻

🧾 REQUIRED OUTPUT FORMAT

## Sprint 26 Validation Report

Overall: READY / PARTIAL / NOT READY

### Authentication & Identity
...

### Workspace & Tenant Model
...

### Environment Model
...

### On-Demand Provisioning
...

### Worker & Queue Isolation
...

### Memory & Artifacts
...

### Hot/Cold Runtime
...

### Deployment Portability
...

### Multi-User Validation
...

### Critical Gaps
...

### Recommendation
...


⸻

💥 Найважливіший критерій

⸻

Sprint 26 успішний, якщо:
	•	user = runtime boundary
	•	environment = execution unit
	•	system працює для 2+ users без leakage
	•	runtime піднімається on-demand
	•	system portable (local + cloud)
	•	немає single-user assumptions

⸻

🔥 Якщо коротко

❗ після Sprint 26 система повинна думати не “я виконую задачу”,
а “я виконую задачу в environment користувача X”

⸻
