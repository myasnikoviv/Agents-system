🟪 Sprint 30 — Tasks

Theme: SaaS Monetization System (Billing / Quotas / Metering / Entitlements)

⸻

🟫 EPIC 1 — Billing Service (Core Domain)

⸻

🎫 AGSYS-3001 — Billing Domain Models

Description
Створити core entities для billing системи.

Acceptance Criteria
	•	Plan (id, name, limits, pricing)
	•	Subscription (tenant_id, plan_id, status)
	•	UsageRecord (typed usage events)
	•	Quota (limit, period, type)
	•	Entitlements (features, limits)
	•	чіткі зв’язки між ними

Handoff
PM → Architect → Backend → QA → PM

⸻

🎫 AGSYS-3002 — Billing Service Boundary

Description
Винести billing в окремий сервіс/модуль.

Acceptance Criteria
	•	окремий namespace/service
	•	не змішаний з runtime
	•	доступ через API
	•	чіткий контракт

Handoff
PM → Backend → DevOps → QA → PM

⸻

⸻

🟫 EPIC 2 — Usage Metering (CRITICAL)

⸻

🎫 AGSYS-3003 — Usage Event Schema

Description
Стандартизувати usage events.

Acceptance Criteria
	•	token_usage event
	•	tool_execution event
	•	runtime_time event
	•	storage_usage event
	•	MCP_usage event
	•	всі events мають tenant/workspace/user

Handoff
PM → Backend → Telemetry → QA → PM

⸻

🎫 AGSYS-3004 — Metering Pipeline

Description
Пайплайн збору usage.

Acceptance Criteria
	•	всі execution paths емитять usage
	•	event-driven pipeline
	•	no missing usage
	•	idempotent

Handoff
PM → Backend → Runtime → QA → PM

⸻

🎫 AGSYS-3005 — Usage Aggregation

Description
Агрегація usage.

Acceptance Criteria
	•	per user
	•	per workspace
	•	per tenant
	•	per billing period
	•	fast lookup

Handoff
PM → Backend → QA → PM

⸻

⸻

🟫 EPIC 3 — Quotas System

⸻

🎫 AGSYS-3006 — Quota Engine

Description
Реалізувати quota evaluation engine.

Acceptance Criteria
	•	hard limits
	•	soft limits
	•	burst handling (optional MVP)
	•	configurable

Handoff
PM → Backend → QA → PM

⸻

🎫 AGSYS-3007 — Pre-Execution Enforcement

Description
Перевірка перед запуском.

Acceptance Criteria
	•	quota check before run
	•	block execution
	•	error message зрозумілий

Handoff
PM → Backend → Runtime → QA → PM

⸻

🎫 AGSYS-3008 — Mid-Execution Enforcement

Description
Контроль під час execution.

Acceptance Criteria
	•	long-running tasks перевіряються
	•	runtime може зупинити execution
	•	safe termination

Handoff
PM → Runtime → Backend → QA → PM

⸻

⸻

🟫 EPIC 4 — Plans & Entitlements

⸻

🎫 AGSYS-3009 — Plan Definitions

Description
Реалізувати тарифні плани.

Acceptance Criteria
	•	Free / Pro / Team / Enterprise
	•	limits визначені
	•	features визначені
	•	versionable

Handoff
PM → Backend → QA → PM

⸻

🎫 AGSYS-3010 — Entitlement Engine

Description
Визначення доступу.

Acceptance Criteria
	•	allowed models
	•	max agents
	•	features
	•	runtime restrictions

Handoff
PM → Backend → Runtime → QA → PM

⸻

⸻

🟫 EPIC 5 — Payment Integration

⸻

🎫 AGSYS-3011 — Payment Provider Integration

Description
Інтеграція (Stripe MVP).

Acceptance Criteria
	•	create subscription
	•	cancel subscription
	•	update plan
	•	webhook handling

Handoff
PM → Backend → QA → PM

⸻

🎫 AGSYS-3012 — Billing Webhooks

Description
Обробка webhook-ів.

Acceptance Criteria
	•	subscription updated
	•	payment failed
	•	payment succeeded
	•	idempotent

Handoff
PM → Backend → QA → PM

⸻

⸻

🟫 EPIC 6 — SaaS Admin Panel

⸻

🎫 AGSYS-3013 — Plans Management UI

Description
Адмінка тарифів.

Acceptance Criteria
	•	create/edit/delete plans
	•	limits editable
	•	pricing editable
	•	safe validation

Handoff
PM → Frontend → Backend → QA → PM

⸻

🎫 AGSYS-3014 — Subscriptions Dashboard

Description
Управління клієнтами.

Acceptance Criteria
	•	список tenant-ів
	•	статус підписки
	•	план
	•	usage overview

Handoff
PM → Frontend → Backend → QA → PM

⸻

🎫 AGSYS-3015 — Usage Analytics UI

Description
Відображення usage.

Acceptance Criteria
	•	usage per tenant
	•	breakdown
	•	trends (basic)

Handoff
PM → Frontend → QA → PM

⸻

⸻

🟫 EPIC 7 — User Billing UI

⸻

🎫 AGSYS-3016 — Billing Page

Description
UI для користувача.

Acceptance Criteria
	•	current plan
	•	usage
	•	quota remaining
	•	upgrade CTA

Handoff
PM → Frontend → QA → PM

⸻

🎫 AGSYS-3017 — Subscription Management

Description
Керування підпискою.

Acceptance Criteria
	•	upgrade/downgrade
	•	cancel
	•	status

Handoff
PM → Frontend → Backend → QA → PM

⸻

⸻

🟫 EPIC 8 — Runtime Integration

⸻

🎫 AGSYS-3018 — Billing → Runtime Integration

Description
Інтеграція billing з execution.

Acceptance Criteria
	•	planner враховує quotas
	•	routing враховує plan
	•	execution блокується

Handoff
PM → Runtime → Backend → QA → PM

⸻

🎫 AGSYS-3019 — Cost-aware Routing (MVP)

Description
Вибір моделей за cost.

Acceptance Criteria
	•	default на дешевші моделі
	•	працює автоматично
	•	policy-driven

Handoff
PM → Runtime → QA → PM

⸻

⸻

🟫 EPIC 9 — Security & Abuse Protection

⸻

🎫 AGSYS-3020 — Anti-Abuse Limits

Description
Захист від abuse.

Acceptance Criteria
	•	rate limits
	•	anomaly detection (basic)
	•	tenant isolation

Handoff
PM → Backend → QA → PM

⸻

⸻

🟫 EPIC 10 — Validation & Consistency

⸻

🎫 AGSYS-3021 — Billing Consistency Checks

Description
Перевірка коректності.

Acceptance Criteria
	•	usage = billing
	•	no missing events
	•	no duplication
	•	no negative usage

Handoff
PM → QA → Backend → PM

⸻

🎫 AGSYS-3022 — Billing E2E Scenario

Description
End-to-end сценарій.

Acceptance Criteria
	•	create tenant
	•	subscribe
	•	use system
	•	usage tracked
	•	quota enforced
	•	billing correct

Handoff
PM → QA → PM

⸻

⸻

🧠 Definition of Done — Sprint 30

⸻

Спринт завершений, якщо:
	•	usage повністю відслідковується
	•	quotas реально працюють
	•	plans впливають на execution
	•	billing UI працює
	•	admin panel працює
	•	немає способу обійти quotas

⸻

💥 Результат

⸻

До:
	•	система без економіки

⸻

Після:
	•	керована SaaS платформа

⸻

🔥 Найважливіше

⸻

Sprint 30 — це:

❗ не про UI
❗ а про економічну модель системи

⸻
