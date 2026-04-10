🟪 SPRINT 22 — Plane-ready Tasks

⸻

🟫 EPIC: Distributed Runtime Execution

⸻

🎫 AGSYS-2201 — Separate Execution Engines

Title: Split quasi-linear and multiple_agents runtime

Description:
Виділити окремі execution paths:
	•	quasi-linear (single runtime)
	•	multiple_agents (worker-based distributed runtime)

Acceptance Criteria:
	•	multiple_agents НЕ використовує PilotQuasiLinearGraph
	•	окремий execution router path
	•	default між режимами відсутній
	•	modeApplied лог показує correct engine

Verification:
	•	run з mode=multiple_agents
	•	перевірити logs → execution path

Handoff:
	•	Executor: Developer
	•	Reviewer: Code Reviewer
	•	Next: AGSYS-2202

⸻

🎫 AGSYS-2202 — Worker-per-Agent Model

Title: Implement dedicated worker per agent

Description:
Кожен агент має виконуватись як окремий worker process

Acceptance Criteria:
	•	worker spawn per agent
	•	worker має isolated context
	•	worker має unique ID
	•	worker не блокує інші

Verification:
	•	запустити 3 агенти
	•	перевірити parallel workers

Handoff:
	•	Executor: Developer
	•	Reviewer: DevOps Engineer
	•	Next: AGSYS-2203

⸻

🎫 AGSYS-2203 — Worker Lifecycle State Machine

Title: Implement worker lifecycle states

Description:
Додати lifecycle:
	•	cold
	•	hot
	•	active
	•	idle
	•	failed

Acceptance Criteria:
	•	кожен worker має state
	•	transitions логуються
	•	heartbeat працює

Verification:
	•	симулювати crash
	•	перевірити state → failed

⸻

🎫 AGSYS-2204 — Queue-based Dispatch System

Title: Enforce queue-based execution

Description:
Всі задачі проходять через ProjectDispatchQueue

Acceptance Criteria:
	•	direct execution заборонено
	•	queue per project
	•	FIFO / priority policy працює

Verification:
	•	enqueue 5 tasks
	•	перевірити порядок

⸻

🎫 AGSYS-2205 — Worker Pull Execution

Title: Implement pull-based execution

Description:
Worker сам бере task з queue

Acceptance Criteria:
	•	no push execution
	•	worker polling або event-based
	•	race conditions відсутні

⸻

🎫 AGSYS-2206 — True Parallel Execution

Title: Enable parallel execution

Acceptance Criteria:
	•	≥2 tasks виконуються одночасно
	•	CPU overlap підтверджений
	•	немає sequential blocking

Verification:
	•	3 tasks → 3 workers → одночасний старт

⸻

🎫 AGSYS-2207 — Deterministic Routing Enforcement

Title: Remove LLM-dependent routing

Acceptance Criteria:
	•	routing НЕ залежить від LLM
	•	enforcedPipeline обов’язковий
	•	enforcedSkills перевіряються

⸻

🎫 AGSYS-2208 — Memory Isolation Hardening

Title: Ensure strict isolation

Acceptance Criteria:
	•	memory namespace = project + agent
	•	leakage між проектами = 0
	•	shared memory тільки через Blackboard

Verification:
	•	2 проекти → однаковий agent → різні дані

⸻

🎫 AGSYS-2209 — Parallel Execution Test Suite

Title: Create distributed runtime tests

Acceptance Criteria:
	•	test: multi-agent chain
	•	test: isolation
	•	test: queue correctness

⸻

⸻

🟦 SPRINT 23 — Plane-ready Tasks

⸻

🟪 EPIC: Adaptive Intelligence Layer

⸻

🎫 AGSYS-2301 — Planner Engine

Title: Implement adaptive planner

Description:
Planner визначає:
	•	agent
	•	pipeline
	•	skills

Acceptance Criteria:
	•	planner викликається перед execution
	•	повертає JSON
	•	routing базується на planner output

⸻

🎫 AGSYS-2302 — Dynamic Skill Selection

Title: Optimize skill usage

Acceptance Criteria:
	•	skill selection НЕ статичний
	•	runtime може змінити skill set
	•	unused skills не викликаються

⸻

🎫 AGSYS-2303 — Adaptive Pipelines

Title: Enable dynamic pipelines

Acceptance Criteria:
	•	pipeline може змінюватись runtime
	•	condition-based branching
	•	default pipelines працюють

⸻

🎫 AGSYS-2304 — Agent Performance Scoring

Title: Implement scoring system

Metrics:
	•	success rate
	•	retry count
	•	token usage
	•	latency

Acceptance Criteria:
	•	score per agent
	•	score доступний у telemetry

⸻

🎫 AGSYS-2305 — Telemetry Aggregation

Title: Aggregate runtime metrics

Acceptance Criteria:
	•	об’єднання telemetry
	•	доступ через API
	•	використовується governance

⸻

🎫 AGSYS-2306 — Self-Healing Loop v2

Title: Verified improvement execution

Acceptance Criteria:
	•	improvement → proposal → validation
	•	тільки verified changes допускаються

⸻

🎫 AGSYS-2307 — Cost Optimization Layer

Title: Implement model selection strategy

Acceptance Criteria:
	•	routing → cheap model
	•	execution → strong model
	•	cost ↓ measurable

⸻

🎫 AGSYS-2308 — Adaptive Behavior Test Suite

Title: Validate adaptive system

Acceptance Criteria:
	•	система змінює поведінку
	•	pipeline змінюється
	•	skill selection змінюється

⸻

💥 Важливий момент (дуже)

Ці тікети написані так, щоб:
	•	❌ не було галюцинацій
	•	✅ можна було перевірити
	•	✅ було видно, чи система реально працює

⸻
