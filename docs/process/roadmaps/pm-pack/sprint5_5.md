Ок, я зібрав це як повністю готовий Sprint 5.5 пакет, строго по твоєму template + з урахуванням вашої агентної моделі і хендофів з  ￼

👉 Тут уже:
	•	правильні ролі
	•	pipeline
	•	порядок виконання
	•	без “води”
	•	можна одразу в Plane кидати

⸻

🟫 SPRINT 5.5 — Enforcement MVP (Executable Governance)

⸻

🧩 TASK S5.5-1 — Git Preflight Hard Gate

Request Metadata
	•	Ticket ID: AGSYS-ENF-001
	•	Project: AGSYS
	•	Pipeline: bug-fix
	•	Owner: PM Orchestrator
	•	Created At: now

⸻

Business Goal

Заборонити будь-яке execution без валідного git preflight.

⸻

Scope
	•	Included:
	•	preflight token check
	•	branch/worktree validation
	•	blocking execution
	•	Excluded:
	•	git recovery pipeline

⸻

User Scenarios
	1.	Запуск таски без preflight → execution блокується
	2.	Запуск з валідним preflight → execution дозволяється

⸻

Constraints
	•	Technical:
	•	перевірка має бути deterministic
	•	Operational:
	•	не використовувати LLM
	•	Timeline:
	•	immediate

⸻

Acceptance Criteria (Measurable)
	1.	Execution не стартує без docs/process/git/preflights/<ticket>.env
	2.	Execution не стартує без branch/worktree binding
	3.	В лог пишеться governance результат

⸻

Risks and Unknowns
	•	Risk: false negatives при визначенні worktree
	•	Unknown: чи всі сценарії preflight покриті

⸻

Owner Approval Gate
	•	Status: PENDING

⸻

🔁 Handoff Protocol
	•	PM → Git Flow Manager (verify preflight)
	•	Git Flow Manager → Developer (allow execution)

⸻

🧩 TASK S5.5-2 — Postflight Hard Gate

Request Metadata
	•	Ticket ID: AGSYS-ENF-002
	•	Project: AGSYS
	•	Pipeline: sprint-integration
	•	Owner: PM Orchestrator

⸻

Business Goal

Заборонити закриття задач без postflight evidence.

⸻

Scope
	•	Included:
	•	test report validation
	•	artifact presence check
	•	Excluded:
	•	content quality validation

⸻

User Scenarios
	1.	Task без test report → не можна закрити
	2.	Task з test report → дозволено

⸻

Acceptance Criteria
	1.	Не можна перевести task в Done без:
	•	docs/process/tests/.md
	2.	Governance лог фіксує PASS/FAIL

⸻

Risks
	•	Risk: false blocking

⸻

🔁 Handoff Protocol
	•	PM → TDD QA (verify tests)
	•	QA → PM (approve close)

⸻

🧩 TASK S5.5-3 — Improvement Loop Soft Gate

Request Metadata
	•	Ticket ID: AGSYS-ENF-003
	•	Project: AGSYS
	•	Pipeline: retrospective-learning
	•	Owner: PM Orchestrator

⸻

Business Goal

Гарантувати, що improvement loop не пропускається.

⸻

Scope
	•	Included:
	•	improvement artifact check
	•	retry logic
	•	Excluded:
	•	quality scoring

⸻

User Scenarios
	1.	Нема improvement → система питає “чому?”
	2.	Після retry → створюється artifact

⸻

Acceptance Criteria
	1.	Перед закриттям task перевіряється artifact
	2.	Якщо нема → retry 1 раз
	3.	Якщо нема → log deviation

⸻

🔁 Handoff Protocol
	•	PM → Knowledge Curator (create improvement)
	•	Knowledge Curator → PM

⸻

🧩 TASK S5.5-4 — Governance Logging

Request Metadata
	•	Ticket ID: AGSYS-ENF-004
	•	Project: AGSYS
	•	Pipeline: unified-task-intake

⸻

Business Goal

Зробити всі governance перевірки видимими.

⸻

Scope
	•	Included:
	•	logging per rule
	•	Excluded:
	•	UI visualization

⸻

Acceptance Criteria
	1.	Для кожного rule лог:

{
  "rule": "git_preflight",
  "status": "pass|fail",
  "action": "block|retry|allow"
}


⸻

🔁 Handoff Protocol
	•	Developer → Audit Agent (verify logs)

⸻

🧩 TASK S5.5-5 — Agent Participation Soft Check

Request Metadata
	•	Ticket ID: AGSYS-ENF-005
	•	Project: AGSYS
	•	Pipeline: new-feature

⸻

Business Goal

Перевіряти, що потрібні агенти реально брали участь.

⸻

Scope
	•	Included:
	•	swarm event parsing
	•	Excluded:
	•	strict blocking

⸻

Acceptance Criteria
	1.	Зібрано список agents з events
	2.	Порівняно з expected
	3.	При mismatch → warning + retry

⸻

🔁 Handoff Protocol
	•	PM → Audit Agent
	•	Audit Agent → PM

⸻

🧩 TASK S5.5-6 — Pipeline Usage Soft Check

Request Metadata
	•	Ticket ID: AGSYS-ENF-006
	•	Project: AGSYS
	•	Pipeline: new-feature

⸻

Business Goal

Перевіряти, що pipeline реально використаний.

⸻

Scope
	•	Included:
	•	stage events
	•	Excluded:
	•	strict enforcement

⸻

Acceptance Criteria
	1.	stage.started events існують
	2.	expected stages покриті
	3.	mismatch → retry 1 раз

⸻

🔁 Handoff Protocol
	•	PM → Solution Architect (verify flow)
	•	Architect → PM

⸻

🧩 TASK S5.5-7 — Cost Tracking (Light)

Request Metadata
	•	Ticket ID: AGSYS-ENF-007
	•	Project: AGSYS
	•	Pipeline: unified-task-intake

⸻

Business Goal

Побачити реальну вартість governance.

⸻

Scope
	•	Included:
	•	token tracking
	•	Excluded:
	•	blocking

⸻

Acceptance Criteria
	1.	tokens per run логуються
	2.	видно governance overhead

⸻

🔁 Handoff Protocol
	•	DevOps → PM

⸻

🧠 ВАЖЛИВИЙ МОМЕНТ

Це повністю відповідає вашим правилам:

✔ pipeline визначений
✔ preflight enforced
✔ artifacts використовуються
✔ roles чіткі
✔ хендофи є

(див.  ￼)

⸻