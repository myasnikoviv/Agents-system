🟪 Sprint 35A — Asset Governance Foundation

📦 Plane Tickets Breakdown

⸻

🧩 EPIC 35A.1 — Asset Registry (Core)

🎯 Goal

Зробити declarative assets first-class entities (DB-first, не просто файли)

⸻

🟨 Story 35A.1.1 — Asset Identity Model

Ticket AGSYS-3501

Title: Define canonical asset identity model

Scope:
	•	описати asset_id strategy (UUID / deterministic)
	•	визначити asset_type enum
	•	визначити ownership:
	•	tenant_id
	•	workspace_id
	•	project_id

Acceptance Criteria:
	•	існує документована модель identity
	•	всі asset types покриваються enum’ом
	•	немає колізій ідентифікації

⸻

🟨 Story 35A.1.2 — Asset Registry Schema

Ticket AGSYS-3502

Title: Implement Asset Registry DB schema

Scope:
	•	створити таблицю asset_registry
	•	поля:
	•	asset_id
	•	asset_type
	•	tenant_id
	•	workspace_id
	•	project_id
	•	source_template_id
	•	source_template_version
	•	current_version
	•	storage_ref
	•	status
	•	compatibility_state
	•	approval_state
	•	customization_level
	•	lineage_parent_asset_id

Acceptance Criteria:
	•	schema створений і мігрується
	•	CRUD доступний через service layer
	•	registry є source of truth

⸻

🟨 Story 35A.1.3 — Registry Service Layer

Ticket AGSYS-3503

Title: Implement Asset Registry Service

Scope:
	•	create/update/get/list/delete
	•	фільтрація:
	•	по workspace
	•	по project
	•	по asset_type
	•	version tracking

Acceptance Criteria:
	•	всі операції доступні через API/service
	•	немає direct file access без registry

⸻

⸻

🧩 EPIC 35A.2 — Template Library & Lineage

⸻

🟨 Story 35A.2.1 — Template Registry

Ticket AGSYS-3504

Title: Implement template registry

Scope:
	•	таблиця template_registry
	•	template_id, version, metadata
	•	категорії:
	•	agent
	•	pipeline
	•	team
	•	role

Acceptance Criteria:
	•	templates мають versioning
	•	templates доступні для генерації

⸻

🟨 Story 35A.2.2 — Lineage Tracking

Ticket AGSYS-3505

Title: Implement asset lineage tracking

Scope:
	•	зв’язок:
	•	template → generated asset
	•	asset → parent asset
	•	зберігати:
	•	source_template_id
	•	source_template_version
	•	customization_level

Acceptance Criteria:
	•	кожен generated asset має lineage
	•	можна відновити походження asset

⸻

⸻

🧩 EPIC 35A.3 — Dependency Graph & Impact Analysis

⸻

🟨 Story 35A.3.1 — Dependency Model

Ticket AGSYS-3506

Title: Define dependency graph model

Scope:
	•	описати edges:
	•	agent → loop
	•	pipeline → agent
	•	skill → tool
	•	meeting → participants
	•	governance → pipelines
	•	створити dependency table

Acceptance Criteria:
	•	dependency graph формалізований
	•	всі ключові зв’язки покриваються

⸻

🟨 Story 35A.3.2 — Impact Analysis Engine

Ticket AGSYS-3507

Title: Implement impact analysis before asset mutation

Scope:
	•	перевірка перед:
	•	delete
	•	replace
	•	edit
	•	повернення:
	•	affected entities
	•	breaking / non-breaking flag

Acceptance Criteria:
	•	система блокує breaking delete
	•	повертається повний impact report

⸻

⸻

🧩 EPIC 35A.4 — Project Initialization v2

⸻

🟨 Story 35A.4.1 — Discovery Layer

Ticket AGSYS-3508

Title: Implement asset discovery from project sources

Scope:
	•	scan repo/folder
	•	знаходити:
	•	agent files
	•	pipelines
	•	skills
	•	configs

Acceptance Criteria:
	•	discovery повертає повний список кандидатів

⸻

🟨 Story 35A.4.2 — Init Flow Pipeline

Ticket AGSYS-3509

Title: Implement init pipeline (discover → validate → normalize → register → activate)

Scope:
	•	pipeline orchestration
	•	state transitions:
	•	discovered
	•	validated
	•	normalized
	•	registered
	•	active

Acceptance Criteria:
	•	init flow працює end-to-end
	•	невалідні assets не активуються

⸻

⸻

🧩 EPIC 35A.5 — Validation Pipeline

⸻

🟨 Story 35A.5.1 — Schema & Policy Validation

Ticket AGSYS-3510

Title: Implement deterministic validation layer

Scope:
	•	schema validation
	•	policy validation:
	•	memory usage
	•	tools
	•	storage
	•	artifacts

Acceptance Criteria:
	•	всі assets проходять validation перед activation

⸻

🟨 Story 35A.5.2 — Normalization & Quarantine

Ticket AGSYS-3511

Title: Implement normalization + quarantine flow

Scope:
	•	якщо asset не проходить validation:
	•	quarantine
	•	auto-fix suggestion
	•	normalization:
	•	rewrite to system-compliant format

Acceptance Criteria:
	•	invalid assets не попадають у runtime
	•	існує quarantine storage

⸻

⸻

🧩 EPIC 35A.6 — Asset Operations Policy

⸻

🟨 Story 35A.6.1 — Operation Matrix

Ticket AGSYS-3512

Title: Define asset operation policy matrix

Scope:
	•	для кожного asset_type:
	•	create
	•	edit
	•	delete
	•	replace
	•	regenerate
	•	визначити:
	•	allowed
	•	requires approval
	•	forbidden

Acceptance Criteria:
	•	є єдина policy matrix
	•	використовується runtime’ом

⸻

🟨 Story 35A.6.2 — Safe Delete / Replace

Ticket AGSYS-3513

Title: Implement safe delete/replace with dependency checks

Scope:
	•	інтеграція з dependency graph
	•	блокування delete якщо є залежності

Acceptance Criteria:
	•	не можна видалити asset, якщо він використовується

⸻

⸻

🧩 EPIC 35A.7 — Approval Scaffolding

⸻

🟨 Story 35A.7.1 — Approval Model

Ticket AGSYS-3514

Title: Implement approval lanes model

Scope:
	•	3 рівні:
	•	workspace
	•	template
	•	product
	•	approval_state в registry

Acceptance Criteria:
	•	кожен asset має approval_state
	•	approval flow визначений

⸻

🟨 Story 35A.7.2 — Approval Fallback

Ticket AGSYS-3515

Title: Implement fallback for missing approver

Scope:
	•	якщо approver не доступний:
	•	escalate
	•	timeout policy

Acceptance Criteria:
	•	немає “висячих” assets без рішення

⸻

⸻

🧩 EPIC 35A.8 — Registry ↔ Filesystem Reconciliation

⸻

🟨 Story 35A.8.1 — Drift Detection

Ticket AGSYS-3516

Title: Implement registry/filesystem drift detection

Scope:
	•	cases:
	•	file exists, no registry
	•	registry exists, no file

Acceptance Criteria:
	•	система виявляє drift
	•	генерує reconciliation report

⸻

🟨 Story 35A.8.2 — Reconciliation Job

Ticket AGSYS-3517

Title: Implement reconciliation job

Scope:
	•	auto/manual reconciliation
	•	fix inconsistencies

Acceptance Criteria:
	•	registry і filesystem синхронні

⸻

⸻

🧩 EPIC 35A.9 — Product Layer Metadata

⸻

🟨 Story 35A.9.1 — Team/Role Metadata

Ticket AGSYS-3518

Title: Extend asset model with product-layer metadata

Scope:
	•	додати поля:
	•	team
	•	role
	•	department
	•	domain
	•	use_case
	•	knowledge bindings

Acceptance Criteria:
	•	assets готові для future UI layer

⸻

🟨 Story 35A.9.2 — Template Categorization

Ticket AGSYS-3519

Title: Categorize templates for product-layer usage

Scope:
	•	категорії:
	•	Marketing
	•	Dev
	•	Research
	•	Strategy
	•	tagging system

Acceptance Criteria:
	•	templates можна використовувати в wizard UX

⸻

⸻

🧪 Sprint 35A — Definition of Done

Спринт вважається завершеним, якщо:
	•	всі declarative assets:
	•	мають registry entries
	•	мають identity
	•	мають lineage
	•	import/init:
	•	не допускає невалідні assets
	•	dependency graph:
	•	працює
	•	блокує небезпечні операції
	•	validation:
	•	deterministic
	•	centralized
	•	approval:
	•	є частиною lifecycle
	•	система:
	•	готова до self-improvement loops

⸻

🚀 Після цього

Наступний крок:

👉 Sprint 35B — Self-Improvement Loops

де вже:
	•	proposal generation
	•	learning
	•	adaptation
	•	optimization

