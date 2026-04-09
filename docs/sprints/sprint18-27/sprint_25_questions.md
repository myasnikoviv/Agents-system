Супер, це якраз той спринт, де без жорсткого валідаційного пакету можна “ніби зробити”, але по факту нічого не зміниться.

Нижче даю Production-grade Validation Pack для Sprint 25 — він перевіряє не код, а архітектурний перелом.

⸻

🟪 SPRINT 25 — FINAL VALIDATION PACK (Architecture Decomposition & SaaS Foundation)

⸻

🎯 Ціль перевірки

Підтвердити, що система:

❗ перестала бути single-node / monolith
❗ і стала SaaS-ready на рівні архітектури

⸻

🧠 Як перевіряємо
	•	тільки через докази
	•	ніяких “так, зроблено”
	•	тільки:
	•	execution traces
	•	API responses
	•	data separation
	•	failure scenarios

⸻

🟫 SECTION 1 — Service Decomposition

⸻

1.1 Чи реально зник “god backend”?

Перевірити:
	•	чи agentSystemBackend.ts більше не:
	•	orchestrator
	•	runtime
	•	governance
	•	UI bridge одночасно

Очікування:
	•	responsibilities розділені по сервісах/модулях
	•	endpoints логічно згруповані
	•	немає одного entrypoint, який знає все

⸻

1.2 Чи існують чіткі service boundaries?

Очікування:
	•	control-plane логічно відділений
	•	runtime dispatcher окремий
	•	governance окремий
	•	telemetry окремий
	•	artifact layer окремий

⸻

1.3 Чи є contracts між сервісами?

Перевірити:
	•	чи є чіткі DTO / API contracts
	•	чи немає прямого імпорту внутрішніх класів між доменами

⸻

❗ КРИТИЧНЕ ПИТАННЯ
	•	Чи можна theoretically винести runtime в окремий процес без переписування всього?

⸻

🟫 SECTION 2 — Queue Externalization

⸻

2.1 Чи queue більше НЕ in-memory?

Перевірити:
	•	queue НЕ зберігається в Map/Array
	•	queue працює через Redis або інший shared store

⸻

2.2 Чи queue переживає crash?

Сценарій:
	•	enqueue task
	•	kill process
	•	підняти знову

Очікування:
	•	task НЕ губиться
	•	task може бути виконаний

⸻

2.3 Чи queue multi-node safe?

Сценарій:
	•	2 інстанси runtime
	•	обидва читають queue

Очікування:
	•	немає double execution
	•	немає race conditions

⸻

🟫 SECTION 3 — Worker State Externalization

⸻

3.1 Чи worker state НЕ в пам’яті?

Перевірити:
	•	worker lifecycle НЕ тримається тільки в RAM
	•	є shared state (Redis/DB)

⸻

3.2 Чи worker видно з іншого процесу?

Сценарій:
	•	worker стартує в процесі A
	•	процес B читає стан

Очікування:
	•	стан доступний глобально

⸻

3.3 Чи worker recovery працює?

Сценарій:
	•	worker впав
	•	task залишився

Очікування:
	•	task не губиться
	•	інший worker може підхопити

⸻

🟫 SECTION 4 — Tenant Isolation

⸻

4.1 Чи існує tenant model?

Перевірити:
	•	tenant entity
	•	workspace entity
	•	project entity

⸻

4.2 Чи є end-to-end isolation?

Перевірити:
	•	memory
	•	queue
	•	artifacts
	•	policies

Очікування:
	•	isolation по tenant гарантований

⸻

4.3 Чи немає leakage?

Сценарій:
	•	tenant A і tenant B
	•	однакові agent names

Очікування:
	•	дані не змішуються

⸻

4.4 Чи isolation enforced, а не “домовились”?

Очікування:
	•	isolation не залежить від дисципліни коду
	•	enforced через namespace / ключі / storage

⸻

🟫 SECTION 5 — Persistence Layer

⸻

5.1 Чи Postgres використовується як source of truth?

Перевірити:
	•	configs
	•	policies
	•	metadata
	•	audit logs

⸻

5.2 Чи SQLite більше НЕ критичний?

Очікування:
	•	SQLite не є основним storage
	•	system не падає без нього

⸻

5.3 Чи FS більше НЕ source of truth?

Перевірити:
	•	artifacts не тільки на диску
	•	logs не тільки jsonl

⸻

❗ КРИТИЧНЕ
	•	чи можна підняти систему на іншій машині без копіювання локального диска?

⸻

🟫 SECTION 6 — Object Storage

⸻

6.1 Чи artifacts винесені з FS?

Очікування:
	•	є abstraction layer
	•	storage не прив’язаний до локального диска

⸻

6.2 Чи retrieval працює через API?
	•	artifacts доступні через service
	•	не через прямий доступ до файлів

⸻

🟫 SECTION 7 — Auth & RBAC

⸻

7.1 Чи існує user model?
	•	user entity
	•	tenant прив’язка

⸻

7.2 Чи RBAC реально працює?

Сценарій:
	•	admin vs member

Очікування:
	•	доступи різні
	•	enforcement є

⸻

7.3 Чи auth не “заглушка”?
	•	не mock
	•	не bypassable

⸻

🟫 SECTION 8 — Secrets Management

⸻

8.1 Де зберігаються secrets?
	•	НЕ plaintext
	•	НЕ в коді
	•	НЕ в .env тільки

⸻

8.2 Чи secrets ізольовані по tenant?

Очікування:
	•	tenant A не бачить tenant B secrets

⸻

8.3 Чи доступ контрольований?
	•	runtime не має зайвих доступів
	•	доступ scoped

⸻

🟫 SECTION 9 — Observability

⸻

9.1 Чи є unified telemetry?
	•	events
	•	traces
	•	logs

⸻

9.2 Чи можна відтворити execution?

Очікування:
	•	trace від task → до completion

⸻

9.3 Чи є audit logs?
	•	хто що зробив
	•	коли
	•	чому

⸻

🟫 SECTION 10 — Multi-node Reality Check

⸻

10.1 Чи система реально працює на 2+ нодах?

Сценарій:
	•	2 runtime інстанси

Очікування:
	•	queue shared
	•	workers shared
	•	tasks розподіляються

⸻

10.2 Чи немає hidden single-node assumptions?

Перевірити:
	•	file paths
	•	in-memory maps
	•	singleton services

⸻

🟫 SECTION 11 — Failure & Recovery

⸻

11.1 Що відбувається при падінні:
	•	runtime
	•	worker
	•	Redis
	•	DB

Очікування:
	•	система не втрачає critical state

⸻

11.2 Чи є retry/recovery?
	•	task retry
	•	worker restart
	•	queue consistency

⸻

🟫 SECTION 12 — Final SaaS Readiness Questions

⸻

❗ Питання 1
	•	Чи можна підняти другу ноду без зміни коду?

⸻

❗ Питання 2
	•	Чи можна onboard нового tenant без ручного втручання?

⸻

❗ Питання 3
	•	Чи system state централізований і доступний з будь-якої ноди?

⸻

❗ Питання 4
	•	Чи можна прибрати локальний filesystem і система все ще працює?

⸻

❗ Питання 5
	•	Чи система безпечна для multi-tenant execution?

⸻

🧾 REQUIRED OUTPUT FORMAT

## Sprint 25 Validation Report

Overall: READY / PARTIAL / NOT READY

### Service Decomposition
...

### Queue & Workers
...

### Tenant Isolation
...

### Persistence Layer
...

### Auth & Security
...

### Observability
...

### Multi-node Readiness
...

### Critical Gaps
...

### Recommendation
...


⸻

💥 Найважливіший критерій

⸻

Sprint 25 успішний, якщо:
	•	немає in-memory truth
	•	немає single-node assumptions
	•	tenant isolation реальний
	•	система працює на 2+ нодах
	•	FS не є критичним
	•	auth/security базово закриті

⸻

🔥 Якщо дуже коротко

❗ після Sprint 25 система повинна фізично мати можливість бути SaaS

⸻