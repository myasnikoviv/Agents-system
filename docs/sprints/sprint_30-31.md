Після Sprint 29 у вас вже:

❗ не одна система
❗ а набір систем із різними зонами відповідальності

І якщо це не зафіксувати зараз — далі буде знову змішування.

⸻

🟪 Оновлена модель перед Sprint 30–31

Тепер у вас є мінімум 3 окремі площини:

⸻

🟦 1. User Platform (Client System)

👉 те, що бачить клієнт
	•	workspace
	•	governance center
	•	execution
	•	billing usage view
	•	payments UI

⸻

🟥 2. Platform Control Plane (Operator System)

👉 ваша внутрішня система
	•	runtime
	•	swarm
	•	infra
	•	policies
	•	MCP
	•	system health

⸻

🟨 3. Business / SaaS System (NEW)

👉 ось це нове, що з’являється у Sprint 30
	•	plans
	•	quotas
	•	billing
	•	subscriptions
	•	entitlements
	•	payments config

⸻

❗ КЛЮЧОВЕ РІШЕННЯ

Billing / IAM / SaaS layer = окрема система,
а не просто “ще один розділ settings”

⸻

🟦 SPRINT 30 — SaaS Monetization System (Billing / Quotas / Entitlements)

⸻

🎯 Goal

Побудувати:

❗ окрему бізнес-систему, яка керує доступом, лімітами і оплатою

⸻

🧠 Core Idea

Після Sprint 29:
	•	execution є
	•	governance є
	•	system control є

Але:

❗ немає “економіки системи”

⸻

🧩 Архітектура Sprint 30

⸻

🔶 1. Billing Domain (ОКРЕМИЙ СЕРВІС)

⸻

Core Entities

⸻

Plan
	•	id
	•	name (Free / Pro / Team / Enterprise)
	•	limits
	•	pricing

⸻

Subscription
	•	tenant_id
	•	plan_id
	•	status
	•	billing cycle

⸻

Usage Record
	•	tokens
	•	runtime time
	•	tool usage
	•	storage

⸻

Quota
	•	type (tokens / time / calls)
	•	limit
	•	period

⸻

Entitlements
	•	allowed models
	•	max agents
	•	features enabled

⸻

⸻

🔶 2. Metering Layer

⸻

Що збираємо:
	•	LLM usage
	•	tool execution
	•	worker runtime
	•	MCP usage
	•	storage

⸻

Важливо:
	•	❗ всі usage → через один pipeline
	•	❗ event-driven (через event bus)

⸻

⸻

🔶 3. Quota Enforcement Layer

⸻

Коли перевіряється:
	•	BEFORE execution
	•	DURING execution
	•	AFTER execution

⸻

Типи:
	•	hard block
	•	soft warning
	•	throttling

⸻

⸻

🔶 4. Payment Integration Layer

⸻

Admin side (L0/L1)
	•	Stripe / інші провайдери
	•	webhook handling
	•	plan mapping

⸻

User side (L3)
	•	subscribe
	•	upgrade/downgrade
	•	payment status
	•	invoices

⸻

⸻

🔶 5. SaaS Admin Panel (NEW SYSTEM)

⸻

📍 Route

/admin/billing


⸻

Sections

⸻

Plans Management
	•	створення тарифів
	•	редагування
	•	versioning

⸻

Subscriptions
	•	список клієнтів
	•	статус
	•	churn

⸻

Usage Analytics
	•	usage per tenant
	•	cost breakdown

⸻

Payment Config
	•	API keys
	•	webhook config
	•	providers

⸻

⸻

🔶 6. User Billing UI

⸻

📍 Route

/workspace/billing


⸻

Sections
	•	current plan
	•	usage stats
	•	quota remaining
	•	upgrade plan
	•	invoices

⸻

⸻

🔶 7. Integration з Runtime

⸻

Важливо:

Billing НЕ окремо, а:
	•	впливає на planner
	•	впливає на governance
	•	впливає на execution

⸻

Приклад:
	•	low quota → cheaper model
	•	no quota → block execution

⸻

⸻

🧪 Success Criteria
	•	usage tracking 100% покриття
	•	quotas реально блокують
	•	plans впливають на runtime
	•	billing UI працює
	•	admin panel працює
	•	немає обходу quota

⸻

⸻

🟥 SPRINT 31 — Enterprise IAM + Security + SRE System

⸻

🎯 Goal

Побудувати:

❗ enterprise-ready операційну систему

⸻

🧠 Core Idea

Після Sprint 30:
	•	можна продавати

Але:

❗ не можна довіряти enterprise клієнтам

⸻

🧩 Архітектура Sprint 31

⸻

🔶 1. Identity System

⸻

SSO
	•	SAML
	•	OIDC

⸻

SCIM
	•	user provisioning
	•	deprovisioning

⸻

Multi-tenant Identity
	•	user → tenant → workspace

⸻

⸻

🔶 2. Authorization Layer

⸻

RBAC
	•	owner
	•	admin
	•	member
	•	viewer

⸻

ABAC
	•	policies
	•	conditions
	•	context-aware access

⸻

⸻

🔶 3. Tenant Isolation Hardening

⸻

Повна ізоляція:
	•	memory
	•	runtime
	•	queues
	•	storage
	•	MCP

⸻

MUST:
	•	zero leakage

⸻

⸻

🔶 4. Secrets System

⸻

	•	scoped secrets
	•	encrypted storage
	•	rotation
	•	access policy

⸻

⸻

🔶 5. Audit System

⸻

Логувати ВСЕ:
	•	execution
	•	config changes
	•	governance changes
	•	billing changes

⸻

Вимоги:
	•	immutable
	•	tamper-resistant

⸻

⸻

🔶 6. SRE Layer

⸻

Observability
	•	metrics
	•	traces
	•	logs

⸻

SLO
	•	execution success rate
	•	latency
	•	uptime

⸻

Alerts
	•	runtime failures
	•	quota issues
	•	system degradation

⸻

⸻

🔶 7. Incident System

⸻

	•	runbooks
	•	escalation
	•	recovery flows

⸻

⸻

🔶 8. Backup & DR

⸻

	•	snapshots
	•	restore flows
	•	RPO / RTO

⸻

⸻

🔶 9. Compliance Foundation

⸻

	•	GDPR basics
	•	PII handling
	•	audit readiness

⸻

⸻

🧪 Success Criteria
	•	SSO працює
	•	RBAC enforced
	•	tenant isolation доведена
	•	audit logs повні
	•	SLO визначені
	•	alerts працюють
	•	DR протестований

⸻

⸻

💥 Найважливіша архітектурна думка

⸻

Після Sprint 31 у вас є:

⸻

1. Product System
	•	workspace
	•	governance
	•	execution

⸻

2. Platform System
	•	control plane
	•	runtime
	•	infra

⸻

3. Business System
	•	billing
	•	quotas
	•	subscriptions

⸻

4. Security System
	•	identity
	•	access
	•	audit

⸻

❗ І це вже повноцінна SaaS платформа

⸻

Після цього:

👉 Sprint 32 — Scaling / autoscaling / distributed execution
👉 Sprint 33 — Growth (onboarding, funnels, UX polish)