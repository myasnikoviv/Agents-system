Так, зрозумів. Тобі не потрібен просто breakdown по епіках — тобі потрібні готові task cards у вашому форматі, як я робив для Sprint 5.5, але тепер для Sprint 6 Governance Engine, з урахуванням:
	•	вашого шаблону intake pack  ￼
	•	вашої multi-agent operating model, ролей, pipeline continuity, preflight/postflight правил і handoff логіки  ￼

Нижче даю саме Plane-ready tasks.

⸻

🟫 SPRINT 6 — Governance Engine

⸻

🧩 TASK S6-1 — Governance Engine Core Entry Point

Request Metadata
	•	Ticket ID: AGSYS-GOV-001
	•	Project: AGSYS
	•	Pipeline: refactor
	•	Owner: Сокіл-Координатор (PM Orchestrator)
	•	Created At: now

Business Goal

Впровадити єдину runtime-точку входу для governance checks, щоб усі policy/gate/enforcement перевірки запускалися централізовано, а не були розмазані по окремих місцях у runtime.

Scope
	•	Included:
	•	governance entry point
	•	hook integration у runtime lifecycle
	•	phase routing for checks
	•	Excluded:
	•	UI panel
	•	dynamic rule editor
	•	advanced workbench enforcement

User Scenarios
	1.	Перед execution runtime викликає governance phase before_execution
	2.	Після execution runtime викликає governance phase after_execution
	3.	Перед task close runtime викликає governance phase before_task_close

Constraints
	•	Technical:
	•	integration only through runtime hooks
	•	no direct dependence on chat rendering
	•	Operational:
	•	governance must not bypass existing runtime
	•	Timeline:
	•	MVP only

Acceptance Criteria (Measurable)
	1.	Governance Engine викликається на фазах:
	•	before_execution
	•	after_execution
	•	before_task_close
	2.	Якщо rules тимчасово вимкнені, runtime поводиться як раніше
	3.	Кожен governance invoke має runId, projectId, ticketId або equivalent scope key
	4.	Є базовий structured result від engine even if no-op

Risks and Unknowns
	•	Risk:
	•	неправильна точка інтеграції може дублювати виклики
	•	Unknown:
	•	чи всі lifecycle hooks уже нормалізовані однаково для всіх режимів

Owner Approval Gate
	•	Status: PENDING
	•	Approved By:
	•	Approved At:
	•	Notes:

🔁 Handoff Protocol
	•	PM Orchestrator → Solution Architect
	•	Solution Architect → Developer
	•	Developer → Audit Agent
	•	Audit Agent → PM Orchestrator

⸻

🧩 TASK S6-2 — Governance Rule Registry (Static MVP)

Request Metadata
	•	Ticket ID: AGSYS-GOV-002
	•	Project: AGSYS
	•	Pipeline: refactor
	•	Owner: Сокіл-Координатор (PM Orchestrator)
	•	Created At: now

Business Goal

Створити централізований static registry governance rules, щоб runtime не тримав policy logic у розкиданому вигляді.

Scope
	•	Included:
	•	static rule registry
	•	metadata for trigger/evidence/evaluation/enforcement
	•	Excluded:
	•	per-user rule editor
	•	database-backed dynamic policy store

User Scenarios
	1.	Runtime отримує rule definition по ruleId
	2.	Governance Engine знає, які rules активні для project profile
	3.	Нове правило можна додати без переписування всього runtime flow

Constraints
	•	Technical:
	•	static MVP registry in code/config
	•	Operational:
	•	registry must support exactly MVP rules first
	•	Timeline:
	•	initial set only

Acceptance Criteria (Measurable)
	1.	Registry містить мінімум 6 правил:
	•	git_preflight
	•	postflight_evidence
	•	improvement_loop
	•	required_agent_usage
	•	required_pipeline_usage
	•	cost_guard_light
	2.	Для кожного правила описані:
	•	trigger
	•	evidence
	•	evaluation type
	•	enforcement mode
	3.	Runtime може завантажити registry без direct dependency on UI
	4.	Rule registry покриває hard/soft/advisory modes

Risks and Unknowns
	•	Risk:
	•	занадто рання абстракція ускладнить MVP
	•	Unknown:
	•	чи потрібен окремий config profile per pipeline already now

Owner Approval Gate
	•	Status: PENDING

🔁 Handoff Protocol
	•	PM Orchestrator → Solution Architect
	•	Solution Architect → Developer
	•	Developer → Documentation Owner
	•	Documentation Owner → PM Orchestrator

⸻

🧩 TASK S6-3 — Event Evidence Collector

Request Metadata
	•	Ticket ID: AGSYS-GOV-003
	•	Project: AGSYS
	•	Pipeline: bug-fix
	•	Owner: Сокіл-Координатор (PM Orchestrator)
	•	Created At: now

Business Goal

Дати Governance Engine можливість збирати runtime events як доказ виконання правил.

Scope
	•	Included:
	•	stage events
	•	agent participation events
	•	handoff-related events
	•	Excluded:
	•	UI visualization
	•	analytics dashboards

User Scenarios
	1.	Rule required_agent_usage читає реально відпрацьованих агентів по events
	2.	Rule required_pipeline_usage читає реально виконані stages
	3.	Rule improvement loop може перевіряти trigger/event trail

Constraints
	•	Technical:
	•	source of truth = runtime events
	•	Operational:
	•	no LLM-based guessing for event evidence
	•	Timeline:
	•	one-run scoped read is enough for MVP

Acceptance Criteria (Measurable)
	1.	Collector повертає події для конкретного runId
	2.	Collector вміє витягнути:
	•	stage.started
	•	agent/stage participation
	•	handoff-related events if present
	3.	Дані придатні для deterministic evaluation
	4.	Є correlation by runId and project/task scope

Risks and Unknowns
	•	Risk:
	•	event naming drift across modes
	•	Unknown:
	•	чи всі потрібні events already emitted consistently

Owner Approval Gate
	•	Status: PENDING

🔁 Handoff Protocol
	•	PM Orchestrator → Audit Agent
	•	Audit Agent → Developer
	•	Developer → PM Orchestrator

⸻

🧩 TASK S6-4 — Artifact Evidence Checker

Request Metadata
	•	Ticket ID: AGSYS-GOV-004
	•	Project: AGSYS
	•	Pipeline: bug-fix
	•	Owner: Сокіл-Координатор (PM Orchestrator)
	•	Created At: now

Business Goal

Перевіряти required artifacts як strong evidence для governance rules.

Scope
	•	Included:
	•	test report existence
	•	improvement artifact existence
	•	preflight token existence
	•	Excluded:
	•	semantic content review of artifacts

User Scenarios
	1.	Перед task close перевіряється test report
	2.	Перед execution перевіряється preflight token
	3.	Improvement loop перевіряє improvement artifact

Constraints
	•	Technical:
	•	deterministic filesystem check first
	•	Operational:
	•	no “LLM says artifact exists”
	•	Timeline:
	•	MVP artifact set only

Acceptance Criteria (Measurable)
	1.	Checker підтримує мінімум:
	•	docs/process/git/preflights/<ticket>.env
	•	docs/process/tests/<ticket>.md
	•	improvement artifact path/pattern defined for MVP
	2.	Checker повертає structured result:
	•	found / not found
	•	matched path
	•	scope linkage key
	3.	Checker може бути викликаний незалежно від chat/UI
	4.	Result usable by Governance Engine without extra parsing

Risks and Unknowns
	•	Risk:
	•	improvement artifact naming may still be unstable
	•	Unknown:
	•	which exact improvement artifact path becomes canonical for MVP

Owner Approval Gate
	•	Status: PENDING

🔁 Handoff Protocol
	•	PM Orchestrator → Documentation Owner
	•	Documentation Owner → Developer
	•	Developer → Audit Agent
	•	Audit Agent → PM Orchestrator

⸻

🧩 TASK S6-5 — Telemetry Reader for Governance

Request Metadata
	•	Ticket ID: AGSYS-GOV-005
	•	Project: AGSYS
	•	Pipeline: unified-task-intake
	•	Owner: Сокіл-Координатор (PM Orchestrator)
	•	Created At: now

Business Goal

Дати Governance Engine доступ до telemetry, яка потрібна для token/cost/usage governance.

Scope
	•	Included:
	•	token usage
	•	skill telemetry
	•	Excluded:
	•	optimization recommendations
	•	dashboards

User Scenarios
	1.	Cost guard читає token usage per run
	2.	Skill/pipeline governance надалі може використовувати telemetry source
	3.	Runtime знає, які governance checks створили overhead

Constraints
	•	Technical:
	•	read-only telemetry integration
	•	Operational:
	•	no blocking on missing non-critical telemetry in MVP
	•	Timeline:
	•	light governance only

Acceptance Criteria (Measurable)
	1.	Reader може повернути token usage per run
	2.	Reader може повернути skill telemetry if available
	3.	Дані прив’язані мінімум до runId або equivalent linkage key
	4.	Відсутність telemetry не ламає execution unless rule is configured as hard dependency

Risks and Unknowns
	•	Risk:
	•	inconsistency between telemetry sources
	•	Unknown:
	•	чи вся skill telemetry already normalized enough for future strict governance

Owner Approval Gate
	•	Status: PENDING

🔁 Handoff Protocol
	•	PM Orchestrator → DevOps Engineer
	•	DevOps Engineer → Developer
	•	Developer → Audit Agent
	•	Audit Agent → PM Orchestrator

⸻

🧩 TASK S6-6 — Deterministic Evaluation Engine

Request Metadata
	•	Ticket ID: AGSYS-GOV-006
	•	Project: AGSYS
	•	Pipeline: refactor
	•	Owner: Сокіл-Координатор (PM Orchestrator)
	•	Created At: now

Business Goal

Реалізувати deterministic evaluator, який перевіряє правила без залучення LLM там, де це можливо.

Scope
	•	Included:
	•	artifact presence checks
	•	event presence checks
	•	telemetry thresholds
	•	Excluded:
	•	semantic LLM judging for complex quality

User Scenarios
	1.	Git preflight rule проходить/падає без LLM
	2.	Postflight evidence rule проходить/падає без LLM
	3.	Cost guard рахується без LLM

Constraints
	•	Technical:
	•	deterministic first is mandatory
	•	Operational:
	•	LLM is fallback, not default
	•	Timeline:
	•	MVP evaluator only

Acceptance Criteria (Measurable)
	1.	Evaluator підтримує мінімум:
	•	artifact exists
	•	event exists
	•	threshold compare
	2.	Evaluator повертає structured verdict:
	•	pass
	•	fail
	•	unknown
	3.	Unknown result can be escalated to hybrid/LLM fallback later
	4.	No LLM call for deterministic checks

Risks and Unknowns
	•	Risk:
	•	edge cases with partial evidence
	•	Unknown:
	•	how many rules will need hybrid fallback immediately

Owner Approval Gate
	•	Status: PENDING

🔁 Handoff Protocol
	•	PM Orchestrator → Solution Architect
	•	Solution Architect → Developer
	•	Developer → TDD QA
	•	TDD QA → PM Orchestrator

⸻

🧩 TASK S6-7 — LLM Verifier Wrapper (Hybrid Fallback)

Request Metadata
	•	Ticket ID: AGSYS-GOV-007
	•	Project: AGSYS
	•	Pipeline: feature-change
	•	Owner: Сокіл-Координатор (PM Orchestrator)
	•	Created At: now

Business Goal

Додати fallback verification wrapper для тих governance checks, де deterministic evidence недостатньо.

Scope
	•	Included:
	•	lightweight verifier wrapper
	•	structured verifier result
	•	Excluded:
	•	broad semantic review of all tasks
	•	full autonomous QA loop

User Scenarios
	1.	Rule не може бути оцінене deterministic способом
	2.	Governance Engine викликає verifier wrapper
	3.	Wrapper повертає structured decision

Constraints
	•	Technical:
	•	lightweight model or cheapest viable verifier path
	•	strict schema output
	•	Operational:
	•	verifier used only when deterministic path insufficient
	•	Timeline:
	•	fallback only

Acceptance Criteria (Measurable)
	1.	Wrapper викликається only for evaluationType = hybrid | llm
	2.	Wrapper повертає structured result, not free text
	3.	Wrapper result може бути використаний enforcement engine
	4.	Є explicit guard against uncontrolled recursive verification

Risks and Unknowns
	•	Risk:
	•	governance cost explodes if verifier overused
	•	Unknown:
	•	what exact schema best fits future complex checks

Owner Approval Gate
	•	Status: PENDING

🔁 Handoff Protocol
	•	PM Orchestrator → Audit Agent
	•	Audit Agent → Developer
	•	Developer → TDD QA
	•	TDD QA → PM Orchestrator

⸻

🧩 TASK S6-8 — Hard Gate Enforcement

Request Metadata
	•	Ticket ID: AGSYS-GOV-008
	•	Project: AGSYS
	•	Pipeline: bug-fix
	•	Owner: Сокіл-Координатор (PM Orchestrator)
	•	Created At: now

Business Goal

Навчити runtime реально блокувати execution/closure по governance hard gates.

Scope
	•	Included:
	•	hard stop behavior
	•	explicit fail result
	•	Excluded:
	•	auto-recovery beyond defined remediation path

User Scenarios
	1.	Немає git preflight → execution blocked
	2.	Немає postflight artifacts → task close blocked

Constraints
	•	Technical:
	•	hard gate must stop progress deterministically
	•	Operational:
	•	block reason must be explicit and logged
	•	Timeline:
	•	MVP hard gates only

Acceptance Criteria (Measurable)
	1.	git_preflight реально блокує execution
	2.	postflight_evidence реально блокує task close
	3.	Runtime повертає explicit block state
	4.	Governance ledger фіксує:
	•	rule
	•	evidence result
	•	action=block

Risks and Unknowns
	•	Risk:
	•	false block due to path mismatch
	•	Unknown:
	•	all close paths currently go through same closure hook or not

Owner Approval Gate
	•	Status: PENDING

🔁 Handoff Protocol
	•	PM Orchestrator → Git Flow Manager
	•	Git Flow Manager → Developer
	•	Developer → TDD QA
	•	TDD QA → PM Orchestrator

⸻

🧩 TASK S6-9 — Soft Gate Enforcement

Request Metadata
	•	Ticket ID: AGSYS-GOV-009
	•	Project: AGSYS
	•	Pipeline: feature-change
	•	Owner: Сокіл-Координатор (PM Orchestrator)
	•	Created At: now

Business Goal

Реалізувати retry / ask / warn flow для soft governance checks.

Scope
	•	Included:
	•	single retry
	•	justification request
	•	deviation logging
	•	Excluded:
	•	endless repair loops
	•	advanced remediation planner

User Scenarios
	1.	Required agent missing → retry once
	2.	Required pipeline stages missing → retry once
	3.	Improvement artifact missing → ask/retry/log

Constraints
	•	Technical:
	•	bounded retries only
	•	Operational:
	•	must not create infinite loops
	•	Timeline:
	•	single retry policy

Acceptance Criteria (Measurable)
	1.	Soft gate retry count bounded to 1 unless explicitly overridden later
	2.	Missing evidence triggers remediation action or justification request
	3.	Repeated fail creates logged violation/deviation
	4.	Execution can continue only according to configured soft policy

Risks and Unknowns
	•	Risk:
	•	retry may repeat same broken behavior with no new evidence
	•	Unknown:
	•	whether justification should be free text or structured already now

Owner Approval Gate
	•	Status: PENDING

🔁 Handoff Protocol
	•	PM Orchestrator → Audit Agent
	•	Audit Agent → Knowledge Curator
	•	Knowledge Curator → Developer
	•	Developer → PM Orchestrator

⸻

🧩 TASK S6-10 — Advisory Governance Mode

Request Metadata
	•	Ticket ID: AGSYS-GOV-010
	•	Project: AGSYS
	•	Pipeline: unified-task-intake
	•	Owner: Сокіл-Координатор (PM Orchestrator)
	•	Created At: now

Business Goal

Підтримати advisory-only governance rules, які не блокують runtime, але дають спостережуваність і warnings.

Scope
	•	Included:
	•	advisory warning handling
	•	logging
	•	Excluded:
	•	UI warning center

User Scenarios
	1.	Cost guard warning shows in logs
	2.	Rule flagged but execution continues
	3.	PM can inspect advisory outcomes later

Constraints
	•	Technical:
	•	advisory mode must never mutate execution flow
	•	Operational:
	•	warnings must remain traceable
	•	Timeline:
	•	MVP only

Acceptance Criteria (Measurable)
	1.	Advisory rule never blocks execution
	2.	Advisory result is written to governance ledger
	3.	Advisory result is distinguishable from soft/hard gates
	4.	Cost guard uses advisory mode in MVP

Risks and Unknowns
	•	Risk:
	•	advisory warnings may be ignored without later UI surfacing
	•	Unknown:
	•	whether PM should also receive advisory summary artifact

Owner Approval Gate
	•	Status: PENDING

🔁 Handoff Protocol
	•	PM Orchestrator → DevOps Engineer
	•	DevOps Engineer → Audit Agent
	•	Audit Agent → PM Orchestrator

⸻

🧩 TASK S6-11 — Governance Ledger

Request Metadata
	•	Ticket ID: AGSYS-GOV-011
	•	Project: AGSYS
	•	Pipeline: refactor
	•	Owner: Сокіл-Координатор (PM Orchestrator)
	•	Created At: now

Business Goal

Зробити audit trail для всіх governance decisions.

Scope
	•	Included:
	•	governance ledger format
	•	write path
	•	linkage to run/ticket
	•	Excluded:
	•	UI browser for ledger

User Scenarios
	1.	Після run можна подивитися, які правила спрацювали
	2.	Для кожного правила видно evidence і action
	3.	Можна дебажити why blocked/retried

Constraints
	•	Technical:
	•	append-only preferred
	•	Operational:
	•	log must be stable enough for later audits
	•	Timeline:
	•	MVP storage format only

Acceptance Criteria (Measurable)
	1.	Кожен governance decision пишеться в ledger
	2.	Ledger містить:
	•	ruleId
	•	runId
	•	ticketId/projectId where available
	•	evidence summary
	•	verdict
	•	action
	•	timestamp
	3.	Ledger format documented
	4.	Ledger can be parsed by future audit tooling

Risks and Unknowns
	•	Risk:
	•	duplicated writes under retries
	•	Unknown:
	•	final storage location standard for governance logs

Owner Approval Gate
	•	Status: PENDING

🔁 Handoff Protocol
	•	PM Orchestrator → Documentation Owner
	•	Documentation Owner → Developer
	•	Developer → Audit Agent
	•	Audit Agent → PM Orchestrator

⸻

🧩 TASK S6-12 — Project-level Policy Binding

Request Metadata
	•	Ticket ID: AGSYS-GOV-012
	•	Project: AGSYS
	•	Pipeline: feature-change
	•	Owner: Сокіл-Координатор (PM Orchestrator)
	•	Created At: now

Business Goal

Дати project-level контроль над тим, які governance rules активні.

Scope
	•	Included:
	•	per-project enabled rules
	•	default profile
	•	Excluded:
	•	user session overrides
	•	visual rule editor

User Scenarios
	1.	Project uses default governance profile
	2.	Rule can be disabled for a project if justified
	3.	Runtime reads policy binding before evaluation

Constraints
	•	Technical:
	•	project-level only in MVP
	•	Operational:
	•	default profile should work out of the box
	•	Timeline:
	•	simple config binding

Acceptance Criteria (Measurable)
	1.	Project can load default enabled rules list
	2.	Runtime reads enabled rules before checks
	3.	Rules can be disabled without code patching
	4.	Missing project-specific config falls back to default governance profile

Risks and Unknowns
	•	Risk:
	•	config drift between projects
	•	Unknown:
	•	whether project-level binding belongs in existing project model or separate config

Owner Approval Gate
	•	Status: PENDING

🔁 Handoff Protocol
	•	PM Orchestrator → Solution Architect
	•	Solution Architect → Developer
	•	Developer → Documentation Owner
	•	Documentation Owner → PM Orchestrator

⸻

🧩 TASK S6-13 — End-to-End Governance Integration Scenario

Request Metadata
	•	Ticket ID: AGSYS-GOV-013
	•	Project: AGSYS
	•	Pipeline: bug-fix
	•	Owner: Сокіл-Координатор (PM Orchestrator)
	•	Created At: now

Business Goal

Підтвердити, що Governance Engine реально змінює поведінку runtime end-to-end, а не існує формально.

Scope
	•	Included:
	•	one full scenario with preflight fail
	•	one full scenario with postflight fail
	•	one soft-gate scenario
	•	Excluded:
	•	performance benchmarking
	•	UI rendering tests

User Scenarios
	1.	Без preflight execution стопається
	2.	Без postflight closure стопається
	3.	Без improvement artifact спрацьовує soft retry / deviation flow

Constraints
	•	Technical:
	•	scenario must use real evidence paths
	•	Operational:
	•	no mocked “success text” without actual evidence
	•	Timeline:
	•	MVP scenario suite

Acceptance Criteria (Measurable)
	1.	Git preflight hard gate доведений end-to-end
	2.	Postflight hard gate доведений end-to-end
	3.	Improvement loop soft gate доведений end-to-end
	4.	Governance ledger shows all 3 outcomes
	5.	Scenario result reproducible

Risks and Unknowns
	•	Risk:
	•	hidden bypass path may still skip governance
	•	Unknown:
	•	whether some closure flow still avoids shared close hook

Owner Approval Gate
	•	Status: PENDING

🔁 Handoff Protocol
	•	PM Orchestrator → TDD QA
	•	TDD QA → Developer
	•	Developer → Audit Agent
	•	Audit Agent → PM Orchestrator

⸻

🧩 TASK S6-14 — Governance Regression & Stability Checks

Request Metadata
	•	Ticket ID: AGSYS-GOV-014
	•	Project: AGSYS
	•	Pipeline: refactor
	•	Owner: Сокіл-Координатор (PM Orchestrator)
	•	Created At: now

Business Goal

Гарантувати, що Governance Engine не створює нескінченні цикли, критичні деградації або неконтрольоване зростання витрат.

Scope
	•	Included:
	•	retry ceiling checks
	•	latency impact check
	•	llm fallback usage check
	•	Excluded:
	•	full cost optimization
	•	large-scale load testing

User Scenarios
	1.	Governance не зациклює runtime
	2.	Governance не викликає verifier без потреби
	3.	Governance latency залишається контрольованою

Constraints
	•	Technical:
	•	bounded retries mandatory
	•	Operational:
	•	deterministic checks remain primary path
	•	Timeline:
	•	stability smoke level only

Acceptance Criteria (Measurable)
	1.	No infinite governance retry loops
	2.	LLM verifier not called for deterministic rules
	3.	Latency increase stays within agreed MVP tolerance
	4.	Governance overhead logged for inspection

Risks and Unknowns
	•	Risk:
	•	hidden chained retries via remediation
	•	Unknown:
	•	exact acceptable latency threshold for current environment

Owner Approval Gate
	•	Status: PENDING

🔁 Handoff Protocol
	•	PM Orchestrator → DevOps Engineer
	•	DevOps Engineer → TDD QA
	•	TDD QA → Audit Agent
	•	Audit Agent → PM Orchestrator

⸻

Рекомендований порядок виконання в спринті
	1.	S6-1 → S6-2
	2.	S6-3 / S6-4 / S6-5
	3.	S6-6 → S6-7
	4.	S6-8 / S6-9 / S6-10
	5.	S6-11 → S6-12
	6.	S6-13 → S6-14

⸻

Що цей спринт дає на виході

Після Sprint 6 у вас буде вже не “система з хорошими інструкціями”, а:
	•	runtime-enforced gates
	•	policy decisions через evidence
	•	audit trail по governance
	•	project-level rule activation
	•	база для Sprint 7 / 8 / 9

⸻
