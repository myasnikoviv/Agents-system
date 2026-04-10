🟪 SPRINT 30 — FINAL VALIDATION PACK

Theme: Billing / Quotas / Metering / Entitlements

⸻

🎯 Ціль

Підтвердити, що:
	•	❗ система реально рахує usage
	•	❗ quotas НЕ можна обійти
	•	❗ plans впливають на runtime
	•	❗ billing = truth (а не приблизно)

⸻

🟫 SECTION 1 — Metering (Truth of Usage)

⸻

1.1 Чи ВСІ execution генерують usage?

Сценарій:
	•	виконати різні типи задач

Очікування:
	•	LLM usage зафіксований
	•	tool usage зафіксований
	•	runtime time зафіксований
	•	MCP usage зафіксований

⸻

1.2 Чи немає “сліпих зон”?
	•	немає execution без usage
	•	немає missing events
	•	coverage = 100%

⸻

1.3 Чи usage idempotent?

Сценарій:
	•	повторити event

Очікування:
	•	немає дублювання
	•	немає подвійного білінгу

⸻

🟫 SECTION 2 — Aggregation

⸻

2.1 Чи usage правильно агрегується?
	•	per user
	•	per workspace
	•	per tenant

⸻

2.2 Чи aggregation точна?
	•	сума events = total usage
	•	немає drift

⸻

2.3 Чи швидкість прийнятна?
	•	швидкий lookup
	•	не потребує heavy scan

⸻

🟫 SECTION 3 — Quotas (CRITICAL)

⸻

3.1 Pre-execution блокування

Сценарій:
	•	quota = 0

Очікування:
	•	execution не стартує
	•	error зрозумілий

⸻

3.2 Mid-execution блокування

Сценарій:
	•	довгий run + перевищення

Очікування:
	•	execution зупиняється
	•	safe shutdown

⸻

3.3 Чи можна обійти quota?

Спробувати:
	•	через інший endpoint
	•	через tool
	•	через retry

Очікування:
	•	обійти НЕ можна

⸻

🟫 SECTION 4 — Plans & Entitlements

⸻

4.1 Чи план реально впливає?

Сценарій:
	•	Free vs Pro

Очікування:
	•	різні ліміти
	•	різні можливості

⸻

4.2 Чи entitlements працюють?
	•	models обмежені
	•	agents обмежені
	•	features обмежені

⸻

4.3 Чи немає bypass?
	•	не можна використати feature поза планом

⸻

🟫 SECTION 5 — Payment Integration

⸻

5.1 Чи subscription lifecycle працює?
	•	create
	•	update
	•	cancel

⸻

5.2 Чи webhook-и надійні?
	•	idempotent
	•	не губляться
	•	не дублюються

⸻

5.3 Чи payment впливає на систему?

Сценарій:
	•	payment failed

Очікування:
	•	доступ обмежується

⸻

🟫 SECTION 6 — Admin Billing Panel

⸻

6.1 Чи можна керувати планами?
	•	create/edit/delete
	•	limits змінюються

⸻

6.2 Чи видно usage?
	•	per tenant
	•	деталізація

⸻

6.3 Чи немає “fake data”?
	•	UI = backend truth

⸻

🟫 SECTION 7 — User Billing UI

⸻

7.1 Чи user бачить usage?
	•	поточний usage
	•	залишок quota

⸻

7.2 Чи user може змінити план?
	•	upgrade
	•	downgrade

⸻

7.3 Чи UX зрозумілий?
	•	немає технічних термінів
	•	зрозуміло “за що платиш”

⸻

🟫 SECTION 8 — Runtime Integration

⸻

8.1 Чи runtime враховує billing?
	•	planner враховує limits
	•	routing враховує cost

⸻

8.2 Чи cost-aware routing працює?
	•	дешевші моделі обираються
	•	policy-driven

⸻

🟫 SECTION 9 — Abuse Protection

⸻

9.1 Чи є rate limits?
	•	працюють
	•	не обходяться

⸻

9.2 Чи є захист від spam usage?
	•	burst detection
	•	блокування

⸻

🟫 SECTION 10 — Reality Check

⸻

❗ Питання
	•	Чи можна зламати billing?
	•	Чи є безкоштовний execution через баг?
	•	Чи співпадає usage з реальністю?
	•	Чи можна продавати це?

⸻

⸻

🟥 SPRINT 31 — FINAL VALIDATION PACK

Theme: IAM + Security + SRE

⸻

🎯 Ціль

Підтвердити, що:
	•	❗ система безпечна
	•	❗ multi-tenant isolation реальний
	•	❗ audit повний
	•	❗ infra стабільна

⸻

🟫 SECTION 1 — Identity

⸻

1.1 Чи auth працює?
	•	login
	•	logout
	•	token refresh

⸻

1.2 Чи SSO працює?
	•	OIDC
	•	SAML

⸻

1.3 Чи SCIM працює?
	•	create user
	•	update
	•	delete

⸻

🟫 SECTION 2 — Authorization

⸻

2.1 Чи RBAC enforced?
	•	roles працюють
	•	доступ обмежений

⸻

2.2 Чи немає bypass?
	•	не можна обійти через API
	•	не можна обійти через UI

⸻

2.3 Чи ABAC працює?
	•	policy rules
	•	context-aware

⸻

🟫 SECTION 3 — Tenant Isolation (CRITICAL)

⸻

3.1 Memory isolation
	•	tenant A не бачить tenant B

⸻

3.2 Runtime isolation
	•	workers ізольовані
	•	немає shared state

⸻

3.3 Storage isolation
	•	дані не змішуються

⸻

3.4 MCP isolation
	•	tools не шаряться
	•	secrets не течуть

⸻

🟫 SECTION 4 — Secrets

⸻

4.1 Чи secrets зашифровані?
	•	encryption at rest

⸻

4.2 Чи доступ обмежений?
	•	scoped access
	•	RBAC

⸻

4.3 Чи є leakage?
	•	logs не містять secrets

⸻

🟫 SECTION 5 — Audit

⸻

5.1 Чи всі дії логуються?
	•	user actions
	•	execution
	•	governance
	•	billing

⸻

5.2 Чи logs immutable?
	•	не можна змінити
	•	append-only

⸻

5.3 Чи logs корисні?
	•	можна відтворити подію

⸻

🟫 SECTION 6 — Observability

⸻

6.1 Метрики
	•	runtime
	•	API
	•	billing

⸻

6.2 Tracing
	•	end-to-end trace
	•	multi-service trace

⸻

6.3 Logging
	•	centralized
	•	searchable

⸻

🟫 SECTION 7 — Alerts & SLO

⸻

7.1 Чи є SLO?
	•	визначені
	•	вимірюються

⸻

7.2 Чи alerts працюють?
	•	failures
	•	degradation

⸻

🟫 SECTION 8 — Backup & DR

⸻

8.1 Backup
	•	регулярний
	•	валідний

⸻

8.2 Restore
	•	tested
	•	без втрат

⸻

🟫 SECTION 9 — Security Reality Check

⸻

❗ Питання
	•	Чи можна отримати доступ до чужих даних?
	•	Чи можна обійти auth?
	•	Чи є leakage secrets?
	•	Чи можна підробити audit?

⸻

🟫 SECTION 10 — Production Readiness

⸻

❗ Питання
	•	Чи можна запускати enterprise клієнта?
	•	Чи система переживе інцидент?
	•	Чи є observability?
	•	Чи можна довіряти системі?

⸻

🧾 REQUIRED OUTPUT (для обох спринтів)

## Sprint Validation Report

Sprint: 30 / 31

Overall: READY / PARTIAL / NOT READY

### Critical Issues
...

### Security Issues
...

### Billing Issues
...

### Gaps
...

### Recommendation
...


⸻
