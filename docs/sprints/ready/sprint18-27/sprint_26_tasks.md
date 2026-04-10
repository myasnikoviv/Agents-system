Супер. Тоді розкладаю Sprint 26 у вашому форматі:
epics → Plane-ready tasks → acceptance → handoff.

⸻

🟪 Sprint 26 — Epics

EPIC 1 — Identity, Auth & Workspace Model

Побудувати user/tenant/workspace foundation.

EPIC 2 — User-Scoped Runtime Environment

Зробити environment окремою runtime-сутністю.

EPIC 3 — On-Demand Provisioning

Підіймати environment тоді, коли він реально потрібен.

EPIC 4 — User-Scoped Worker & Resource Model

Прив’язати workers/agents/queues/memory до environment.

EPIC 5 — Hot/Cold Runtime Strategy

Закласти hot/cold/warm policy для агентів усередині environment.

EPIC 6 — Deployment Portability

Забезпечити parity між local/self-hosted і cloud/container runtime.

EPIC 7 — Environment Control & Telemetry

Зробити environment observable і керованим.

EPIC 8 — Validation

Підтвердити, що модель реально працює.

⸻

🟫 EPIC 1 — Identity, Auth & Workspace Model

🎫 AGSYS-2601 — User / Tenant / Workspace Domain Model

Description
Описати й імплементувати модель:
	•	user
	•	tenant
	•	workspace
	•	project
	•	environment

Acceptance Criteria
	•	entities formalized
	•	relationships documented
	•	user → tenant/workspace binding exists
	•	project belongs to workspace/tenant deterministically

Handoff
PM → Solution Architect → Developer → Documentation Owner → PM

⸻

🎫 AGSYS-2602 — Authentication Foundation

Description
Додати базову auth-систему для user identity.

Acceptance Criteria
	•	user can authenticate
	•	authenticated identity available to backend/runtime
	•	anonymous access to protected control/runtime endpoints blocked
	•	local dev mode supported separately

Handoff
PM → Backend → Security Reviewer → QA → PM

⸻

🎫 AGSYS-2603 — Workspace Context Resolution

Description
Усі ключові runtime/composition actions мають виконуватися в рамках selected workspace.

Acceptance Criteria
	•	backend resolves active workspace context
	•	project access without workspace/user binding blocked
	•	workspace context propagated to runtime commands
	•	context switching deterministic

Handoff
PM → Backend → QA → PM

⸻

🟫 EPIC 2 — User-Scoped Runtime Environment

🎫 AGSYS-2604 — Environment Entity & Lifecycle Model

Description
Створити runtime entity environment для user/workspace.

Acceptance Criteria
	•	environment has identity
	•	environment scoped to tenant/workspace
	•	lifecycle states defined:
	•	provisioning
	•	warming
	•	active
	•	idle
	•	suspended
	•	terminated
	•	failed
	•	transitions logged

Handoff
PM → Solution Architect → Developer → Audit Agent → PM

⸻

🎫 AGSYS-2605 — Environment State Persistence

Description
Стан environment має бути externalized, не тільки в RAM.

Acceptance Criteria
	•	environment state persisted
	•	state recoverable after restart
	•	cross-process visibility exists
	•	no in-memory-only truth for environment lifecycle

Handoff
PM → Backend → DevOps → QA → PM

⸻

🟫 EPIC 3 — On-Demand Provisioning

🎫 AGSYS-2606 — Environment Provisioning Service

Description
Створити сервіс, який on-demand піднімає environment.

Acceptance Criteria
	•	environment can be provisioned on request
	•	provisioning emits progress/status
	•	repeated request is idempotent
	•	failed provisioning returns explicit state

Handoff
PM → Backend → DevOps → QA → PM

⸻

🎫 AGSYS-2607 — Environment Warmup Flow

Description
Після provisioning середовище має прогріти базові runtime dependencies.

Acceptance Criteria
	•	warmup state exists
	•	required services/connectors initialized
	•	first-run latency after warmup reduced
	•	warmup outcome visible in telemetry

Handoff
PM → Backend → DevOps → QA → PM

⸻

🎫 AGSYS-2608 — Environment Suspend / Resume Flow

Description
Додати можливість переводити environment у suspended state і повертати назад.

Acceptance Criteria
	•	idle environment can be suspended
	•	resume restores environment usability
	•	queues/memory/artifacts remain consistent
	•	state transitions logged

Handoff
PM → Backend → DevOps → QA → PM

⸻

🟫 EPIC 4 — User-Scoped Worker & Resource Model

🎫 AGSYS-2609 — Environment-Scoped Worker Pool

Description
Workers мають належати не глобально системі, а environment.

Acceptance Criteria
	•	worker bound to environmentId
	•	worker cannot process task outside its environment
	•	worker roster query is environment-scoped
	•	no cross-environment worker reuse without explicit policy

Handoff
PM → Backend → Runtime Engineer → QA → PM

⸻

🎫 AGSYS-2610 — Environment-Scoped Queue Model

Description
Черги задач мають бути scoped to environment.

Acceptance Criteria
	•	queue namespace includes environment identity
	•	task from one environment never appears in another
	•	dispatch uses environment context
	•	queue metrics available per environment

Handoff
PM → Backend → Runtime Engineer → QA → PM

⸻

🎫 AGSYS-2611 — Environment-Scoped Memory & Artifact Boundaries

Description
Memory, artifacts, telemetry мають бути environment-aware.

Acceptance Criteria
	•	memory namespace includes tenant/workspace/environment
	•	artifacts scoped by environment
	•	telemetry scoped by environment
	•	no leakage across environments in validation scenario

Handoff
PM → Backend → Audit Agent → QA → PM

⸻

🟫 EPIC 5 — Hot/Cold Runtime Strategy

🎫 AGSYS-2612 — Hot/Cold Policy for Environment Workers

Description
Закласти policy, які агенти тримати hot, а які cold у межах environment.

Acceptance Criteria
	•	hot/cold policy formalized
	•	not all agents are started eagerly
	•	cold agents can start on demand
	•	hot worker count visible in telemetry

Handoff
PM → Solution Architect → Backend → QA → PM

⸻

🎫 AGSYS-2613 — Idle Eviction / Demotion Policy

Description
Додати policy, коли hot workers demote to standby/cold.

Acceptance Criteria
	•	idle timeout configurable
	•	demotion deterministic
	•	demotion does not corrupt state
	•	pressure reduction measurable

Handoff
PM → Backend → DevOps → QA → PM

⸻

🟫 EPIC 6 — Deployment Portability

🎫 AGSYS-2614 — Runtime Infrastructure Abstraction Layer

Description
Винести storage/queue/secrets/artifacts за provider interfaces.

Acceptance Criteria
	•	local and cloud implementations supported
	•	runtime code does not directly depend on local FS paths
	•	provider selection config-driven
	•	abstractions documented

Handoff
PM → Solution Architect → Developer → Documentation Owner → PM

⸻

🎫 AGSYS-2615 — Self-Hosted + Cloud Profile Support

Description
Підтримати deployment profiles:
	•	local/self-hosted
	•	cloud-ready

Acceptance Criteria
	•	profile-based config exists
	•	same app logic works in both profiles
	•	no code rewrite required between profiles
	•	startup docs for both profiles exist

Handoff
PM → DevOps → Backend → QA → PM

⸻

🎫 AGSYS-2616 — Container Packaging for Control + Runtime

Description
Підготувати containerized deployment units.

Acceptance Criteria
	•	backend/control plane containerized
	•	runtime/worker plane containerized
	•	images build reproducibly
	•	local compose/dev launch supported

Handoff
PM → DevOps → QA → PM

⸻

🟫 EPIC 7 — Environment Control & Telemetry

🎫 AGSYS-2617 — Environment Status API

Description
Додати API для читання статусу environment.

Acceptance Criteria
	•	returns lifecycle state
	•	returns worker summary
	•	returns queue summary
	•	returns last activity / warmup status

Handoff
PM → Backend → Frontend → QA → PM

⸻

🎫 AGSYS-2618 — Environment Provisioning Telemetry

Description
Телеметрія по provisioning/warmup/resume/suspend.

Acceptance Criteria
	•	provisioning traces captured
	•	cold-start latency visible
	•	failure reasons visible
	•	environment lifecycle auditable

Handoff
PM → Backend → DevOps → Audit Agent → PM

⸻

🎫 AGSYS-2619 — User-Aware Control Restrictions

Description
Control actions мають бути прив’язані до authenticated user permissions.

Acceptance Criteria
	•	only authorized user can control environment
	•	cross-tenant access blocked
	•	audit log records actor identity
	•	forbidden action returns explicit error

Handoff
PM → Backend → Security Reviewer → QA → PM

⸻

🟫 EPIC 8 — Validation

🎫 AGSYS-2620 — Multi-User Local Validation Scenario

Description
Підтвердити, що локально можна створити мінімум 2 різних user/workspace contexts.

Acceptance Criteria
	•	user A and user B both exist
	•	separate environments created
	•	no queue/memory/artifact leakage
	•	validation report produced

Handoff
PM → QA → Audit Agent → PM

⸻

🎫 AGSYS-2621 — On-Demand Environment Lifecycle Test Suite

Description
Перевірити:
	•	provision
	•	warm
	•	active
	•	idle
	•	suspend
	•	resume
	•	terminate

Acceptance Criteria
	•	each lifecycle transition tested
	•	recovery scenarios covered
	•	failed provisioning scenario covered
	•	logs and metrics attached

Handoff
PM → QA → DevOps → PM

⸻

🎫 AGSYS-2622 — Local-to-Cloud Portability Validation

Description
Підтвердити, що система працює локально і cloud-ready без переписування runtime.

Acceptance Criteria
	•	same runtime logic used in both profiles
	•	local profile works
	•	cloud profile config resolves
	•	infra dependencies abstracted, not hardcoded

Handoff
PM → DevOps → QA → PM

⸻

🧠 Definition of Done — Sprint 26

Спринт завершений, якщо:
	•	існує auth foundation
	•	user/tenant/workspace/environment model formalized
	•	environment provisioning on demand працює
	•	workers/queues/memory scoped by environment
	•	hot/cold strategy exists
	•	local + cloud deployment profiles exist
	•	system can run locally for one user and be portable to cloud

⸻

Рекомендований порядок виконання
	1.	AGSYS-2601 → 2602 → 2603
	2.	AGSYS-2604 → 2605
	3.	AGSYS-2606 → 2607 → 2608
	4.	AGSYS-2609 → 2610 → 2611
	5.	AGSYS-2612 → 2613
	6.	AGSYS-2614 → 2615 → 2616
	7.	AGSYS-2617 → 2618 → 2619
	8.	AGSYS-2620 → 2621 → 2622

⸻

Що дає Sprint 26

Після нього система буде:
	•	self-hostable
	•	cloud-portable
	•	multi-user ready
	•	environment-scoped
	•	on-demand scalable

Але ще без billing/monetization layer.

⸻