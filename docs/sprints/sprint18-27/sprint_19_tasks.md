🟫 Sprint 19 — Epics Breakdown

🧩 Epic 1 — Project-Scoped Agent Identity

Кожен агент має існувати не “глобально”, а як сутність:
	•	projectId
	•	agentSlug
	•	workerId

Тобто:
	•	один і той самий developer у trade_bot
	•	і developer у spark_keeper

це різні runtime entities.

⸻

🧩 Epic 2 — Dynamic Worker Runtime

Агенти не підняті всі одразу.

Система:
	•	дивиться на активний проєкт,
	•	читає agent manifest / generated agent files,
	•	визначає доступний agent set,
	•	піднімає тільки потрібних.

⸻

🧩 Epic 3 — Hot / Warm / Cold Agent Lifecycle

Треба ввести окремі стани:
	•	active — зараз виконує задачу
	•	standby — піднятий, але без задачі
	•	hot — завантажений у пам’ять / ready
	•	cold — не піднятий, лише описаний у registry
	•	starting
	•	stopping
	•	failed

Тобто standby ≠ hot/cold.

⸻

🧩 Epic 4 — Worker Pool & Resource Management

Система має:
	•	обмежувати max workers per project
	•	обмежувати total workers globally
	•	мати eviction policy
	•	мати policy для standby timeout

⸻

🧩 Epic 5 — Project Switch Orchestration

Коли користувач перемикається між проєктами:
	•	активний проєкт отримує пріоритет
	•	hot workers можуть бути підняті саме для нього
	•	неактивні проєкти можуть деградувати до cold/warm

⸻

🧩 Epic 6 — Queue & Task Dispatch

Task routing має працювати не в центральному quasi-linear loop, а через:
	•	project-scoped queues
	•	agent-eligible queues
	•	worker pickup

⸻

🧩 Epic 7 — Real Swarm Controller

Права панель має відображати не просто “останні події”, а реальний стан worker-ів:
	•	enabled / disabled
	•	hot / cold
	•	active / standby
	•	heartbeat
	•	assigned task
	•	queue depth / pressure

⸻

🧩 Epic 8 — Runtime Telemetry for Agent Utilization

Потрібно збирати:
	•	frequency of agent usage
	•	average task duration
	•	wake-up count
	•	cold-start latency
	•	idle time

щоб потім можна було приймати рішення:
	•	кого тримати hot
	•	кого тримати cold

⸻

🟫 Plane-ready tasks for Sprint 19

🧩 TASK S19-1 — Project-Scoped Agent Identity Model

Request Metadata
	•	Ticket ID: AGSYS-MA-001
	•	Project: AGSYS
	•	Pipeline: refactor
	•	Owner: Сокіл-Координатор (PM Orchestrator)

Business Goal

Гарантувати, що агенти ізолюються між проєктами і не ділять runtime identity або memory namespace.

Scope
	•	Included:
	•	projectId + agentSlug identity contract
	•	worker identity model
	•	memory namespace contract
	•	Excluded:
	•	worker spawning

Acceptance Criteria
	1.	Один і той самий agent slug у різних проєктах має різний runtime identity
	2.	Memory namespace включає projectId
	3.	Нема cross-project collision for workers
	4.	Identity contract documented

🔁 Handoff

PM → Solution Architect → Developer → Audit Agent → PM

⸻

🧩 TASK S19-2 — Agent Manifest Loader per Project

Request Metadata
	•	Ticket ID: AGSYS-MA-002
	•	Project: AGSYS
	•	Pipeline: refactor

Business Goal

Завантажувати набір агентів саме з активного проєкту, а не з глобального runtime state.

Scope
	•	Included:
	•	project agent discovery
	•	manifest/agent file loader
	•	Excluded:
	•	hot/cold logic

Acceptance Criteria
	1.	Для кожного project runtime бачить тільки його agent set
	2.	Loader працює при вході в project
	3.	Loader не підтягує агентів інших проєктів
	4.	Result available to dispatcher and swarm controller

🔁 Handoff

Architect → Developer → Documentation Owner → PM

⸻

🧩 TASK S19-3 — Dynamic Worker Spawn Manager

Request Metadata
	•	Ticket ID: AGSYS-MA-003
	•	Project: AGSYS
	•	Pipeline: feature-change

Business Goal

Підіймати worker-и динамічно, а не тримати всі агенти завжди активними.

Scope
	•	Included:
	•	on-demand worker spawn
	•	spawn by project/agent identity
	•	Excluded:
	•	autoscaling heuristics

Acceptance Criteria
	1.	Worker створюється тільки коли потрібен
	2.	Worker прив’язаний до project-scoped agent identity
	3.	Spawn result visible in runtime events
	4.	No eager spawn of all project agents by default

🔁 Handoff

PM → Solution Architect → Developer → TDD QA → PM

⸻

🧩 TASK S19-4 — Agent Lifecycle State Model (Hot/Warm/Cold + Active/Standby)

Request Metadata
	•	Ticket ID: AGSYS-MA-004
	•	Project: AGSYS
	•	Pipeline: refactor

Business Goal

Розвести availability state і execution state агента.

Scope
	•	Included:
	•	lifecycle states
	•	state transitions
	•	Excluded:
	•	UI implementation

Acceptance Criteria
	1.	Є documented states:
	•	cold
	•	hot
	•	active
	•	standby
	•	starting
	•	stopping
	•	failed
	2.	standby не використовується як синонім hot
	3.	Runtime state machine transitions are deterministic
	4.	Events emitted on state changes

🔁 Handoff

PM → Solution Architect → Developer → Audit Agent → PM

⸻

🧩 TASK S19-5 — Worker Heartbeat & Health Monitoring

Request Metadata
	•	Ticket ID: AGSYS-MA-005
	•	Project: AGSYS
	•	Pipeline: bug-fix

Business Goal

Мати реальний моніторинг живих worker-ів, а не імітацію по останніх подіях.

Scope
	•	Included:
	•	heartbeat
	•	health status
	•	stale worker detection
	•	Excluded:
	•	auto-remediation UI

Acceptance Criteria
	1.	Кожен active/hot worker шле heartbeat
	2.	Runtime виявляє stale / dead worker
	3.	Health state visible to swarm controller backend
	4.	Heartbeat timeout configurable

🔁 Handoff

PM → DevOps Engineer → Developer → Audit Agent → PM

⸻

🧩 TASK S19-6 — Project-Scoped Task Queue

Request Metadata
	•	Ticket ID: AGSYS-MA-006
	•	Project: AGSYS
	•	Pipeline: feature-change

Business Goal

Перевести dispatch на project-scoped async queue model.

Scope
	•	Included:
	•	per-project queue
	•	task routing to eligible workers
	•	Excluded:
	•	advanced priority scheduling

Acceptance Criteria
	1.	Tasks входять у queue, а не виконуються центральним brain loop
	2.	Queue scoped by project
	3.	Eligible worker picks task asynchronously
	4.	Queue events visible in telemetry

🔁 Handoff

PM → Solution Architect → Developer → TDD QA → PM

⸻

🧩 TASK S19-7 — Multiple Agents Distributed Execution Mode

Request Metadata
	•	Ticket ID: AGSYS-MA-007
	•	Project: AGSYS
	•	Pipeline: sprint-integration

Business Goal

Зробити multiple_agents реально відмінним від quasi-linear.

Scope
	•	Included:
	•	distributed worker execution mode
	•	mode switch
	•	Excluded:
	•	cost optimization

Acceptance Criteria
	1.	multiple_agents використовує worker runtime, а не central orchestrator imitation
	2.	Мінімум 2 worker-и можуть обробляти задачі одночасно
	3.	Parallel execution підтверджено events/heartbeats
	4.	quasi-linear і multiple_agents мають різний execution backend

🔁 Handoff

PM → Solution Architect → Developer → TDD QA → Audit Agent → PM

⸻

🧩 TASK S19-8 — Worker Resource Limits & Pool Control

Request Metadata
	•	Ticket ID: AGSYS-MA-008
	•	Project: AGSYS
	•	Pipeline: refactor

Business Goal

Не допустити неконтрольованого росту кількості worker-ів і перевитрати пам’яті/CPU.

Scope
	•	Included:
	•	per-project worker limits
	•	global worker limit
	•	idle timeout
	•	Excluded:
	•	adaptive auto-hot ranking

Acceptance Criteria
	1.	Є max workers per project
	2.	Є global max workers
	3.	Idle workers can be demoted/stopped after timeout
	4.	Resource limits configurable

🔁 Handoff

PM → DevOps Engineer → Developer → Audit Agent → PM

⸻

🧩 TASK S19-9 — Project Switch Runtime Policy

Request Metadata
	•	Ticket ID: AGSYS-MA-009
	•	Project: AGSYS
	•	Pipeline: feature-change

Business Goal

Описати і реалізувати, як runtime поводиться при перемиканні активного проєкту.

Scope
	•	Included:
	•	active project priority
	•	project switch lifecycle behavior
	•	Excluded:
	•	predictive prewarming

Acceptance Criteria
	1.	При switch активний project отримує runtime priority
	2.	Неактивні projects не тримають увесь agent set hot без потреби
	3.	Transition policy documented and implemented
	4.	No memory/context bleed during project switch

🔁 Handoff

PM → Solution Architect → Developer → TDD QA → PM

⸻

🧩 TASK S19-10 — Agent Utilization Telemetry

Request Metadata
	•	Ticket ID: AGSYS-MA-010
	•	Project: AGSYS
	•	Pipeline: unified-task-intake

Business Goal

Збирати статистику використання агентів для подальшого hot/cold management.

Scope
	•	Included:
	•	agent invocation count
	•	task duration
	•	cold-start count
	•	idle time
	•	Excluded:
	•	adaptive policy decisions

Acceptance Criteria
	1.	Telemetry collects usage frequency per project/agent
	2.	Cold start and idle metrics logged
	3.	Data available for future optimization layer
	4.	Telemetry does not break execution flow

🔁 Handoff

PM → DevOps Engineer → Developer → Documentation Owner → PM

⸻

🧩 TASK S19-11 — Swarm Controller Backend Contract Upgrade

Request Metadata
	•	Ticket ID: AGSYS-MA-011
	•	Project: AGSYS
	•	Pipeline: refactor

Business Goal

Змінити backend contract swarm controller так, щоб він відображав реальний стан worker-ів.

Scope
	•	Included:
	•	worker status contract
	•	heartbeat state
	•	hot/cold state
	•	active/standby state
	•	Excluded:
	•	final frontend rendering polish

Acceptance Criteria
	1.	Backend exposes:
	•	enabled/disabled
	•	hot/cold
	•	active/standby
	•	heartbeat freshness
	•	assigned task
	2.	Data project-scoped
	3.	Contract documented
	4.	Ready for UI integration in Sprint 18+

🔁 Handoff

PM → Solution Architect → Developer → Frontend Dev → PM

⸻

🧩 TASK S19-12 — End-to-End Real Multi-Agent Validation Scenario

Request Metadata
	•	Ticket ID: AGSYS-MA-012
	•	Project: AGSYS
	•	Pipeline: sprint-integration

Business Goal

Підтвердити end-to-end, що multi-agent runtime став реальним, а не імітованим.

Scenario
	1.	Активний project loaded
	2.	Required agent set discovered
	3.	Workers spawned on demand
	4.	Мінімум 2 workers execute in parallel
	5.	Heartbeats visible
	6.	Queue dispatch works
	7.	Swarm controller state reflects reality

Acceptance Criteria
	1.	Scenario reproducible
	2.	Parallel execution proven by independent worker traces
	3.	No central single-process fallback pretending to be multi-agent
	4.	Project isolation preserved
	5.	Validation report produced

🔁 Handoff

PM → TDD QA → Developer → Audit Agent → PM

⸻

Рекомендований порядок виконання
	1.	S19-1 → S19-2
	2.	S19-4 → S19-5
	3.	S19-3 → S19-6
	4.	S19-7
	5.	S19-8 → S19-9
	6.	S19-10 → S19-11
	7.	S19-12

⸻

Ключове уточнення для Sprint 19

Ти правильно підсвітив, що треба додати в модель runtime два різні виміри стану:

Availability state
	•	cold
	•	hot

Execution state
	•	active
	•	standby

І це має бути окремо видно в swarm controller, бо інакше “standby” зараз змішує:
	•	агент піднятий і готовий,
	•	агент просто не виконує задачу,
	•	агент узагалі не існує як процес.

⸻

Висновок

Sprint 19 у вас тепер не просто “distributed mode”, а:

реальний project-scoped dynamic multi-agent runtime з resource management і правдивим swarm state.