Ок, роблю тобі Sprint 8 → повний Plane-ready пакет, як ти любиш:
	•	по твоєму шаблону
	•	з ролями
	•	з pipeline
	•	з чіткими acceptance
	•	без “води”

⸻

🟫 SPRINT 8 — Skill & Pipeline Compliance Engine

⸻

🧩 TASK S8-1 — Task Analyzer (Pipeline / Agent / Skill Detection)

Request Metadata
	•	Ticket ID: AGSYS-COMP-001
	•	Project: AGSYS
	•	Pipeline: unified-task-intake
	•	Owner: Сокіл-Координатор (PM Orchestrator)

⸻

Business Goal

Автоматично визначати, які:
	•	pipeline
	•	агенти
	•	скіли

потрібні для задачі.

⸻

Scope
	•	Included:
	•	task classification
	•	mapping → pipeline / agents / skills
	•	Excluded:
	•	ML-based classification
	•	dynamic learning

⸻

User Scenarios
	1.	User: “fix bug” → визначається bug-fix pipeline
	2.	User: “add feature” → new-feature pipeline
	3.	Analyzer повертає structured plan

⸻

Acceptance Criteria
	1.	Analyzer повертає:

{
  "pipeline": "",
  "agents": [],
  "skills": []
}

	2.	Мінімум покриті сценарії:
	•	bug-fix
	•	new-feature
	•	refactor
	3.	Не повертає пусті значення

⸻

🔁 Handoff

PM → Solution Architect → Developer → Audit Agent → PM

⸻

🧩 TASK S8-2 — Execution Plan Builder

Request Metadata
	•	Ticket ID: AGSYS-COMP-002
	•	Pipeline: feature-change

⸻

Business Goal

Перетворити analyzer output у execution plan.

⸻

Scope
	•	Included:
	•	structured execution plan
	•	Excluded:
	•	runtime execution

⸻

Acceptance Criteria
	1.	Plan містить:

{
  "pipeline": "",
  "agents": [],
  "skills": [],
  "stages": []
}

	2.	План використовується runtime
	3.	План прив’язаний до runId

⸻

🔁 Handoff

Architect → Developer → PM

⸻

🧩 TASK S8-3 — Pre-Execution Compliance Gate

Request Metadata
	•	Ticket ID: AGSYS-COMP-003
	•	Pipeline: bug-fix

⸻

Business Goal

Заборонити execution без визначеного plan.

⸻

User Scenarios
	1.	Нема plan → execution не стартує
	2.	Plan є → execution дозволено

⸻

Acceptance Criteria
	1.	Без plan:
	•	execution blocked
	2.	Governance log:
	•	rule = plan_required
	3.	Plan доступний runtime

⸻

🔁 Handoff

PM → Developer → TDD QA → PM

⸻

🧩 TASK S8-4 — Required Agent Compliance

Request Metadata
	•	Ticket ID: AGSYS-COMP-004
	•	Pipeline: feature-change

⸻

Business Goal

Перевіряти, що потрібні агенти реально використовуються.

⸻

Acceptance Criteria
	1.	Required agents ⊆ actual agents
	2.	Якщо mismatch:
	•	retry 1 раз
	3.	Другий fail:
	•	log deviation

⸻

🔁 Handoff

PM → Audit Agent → Developer → PM

⸻

🧩 TASK S8-5 — Required Pipeline Compliance

Request Metadata
	•	Ticket ID: AGSYS-COMP-005
	•	Pipeline: feature-change

⸻

Business Goal

Контролювати використання pipeline.

⸻

Acceptance Criteria
	1.	Required stages виконані
	2.	Missing stages → retry
	3.	Retry limit = 1

⸻

🔁 Handoff

Architect → Developer → Audit Agent → PM

⸻

🧩 TASK S8-6 — Skill Usage Compliance

Request Metadata
	•	Ticket ID: AGSYS-COMP-006
	•	Pipeline: feature-change

⸻

Business Goal

Перевіряти, що потрібні скіли використовуються.

⸻

Scope
	•	Included:
	•	skill telemetry usage
	•	Excluded:
	•	skill quality

⸻

Acceptance Criteria
	1.	Required skills ⊆ used skills
	2.	Missing skills → retry
	3.	Дані беруться з telemetry

⸻

🔁 Handoff

PM → DevOps → Developer → Audit Agent → PM

⸻

🧩 TASK S8-7 — Compliance Enforcement Loop

Request Metadata
	•	Ticket ID: AGSYS-COMP-007
	•	Pipeline: retrospective-learning

⸻

Business Goal

Запустити loop виправлення при відхиленні.

⸻

Behavior
	1.	Detect mismatch
	2.	Retry
	3.	Якщо fail:
	•	ask justification
	•	або log

⸻

Acceptance Criteria
	1.	Retry максимум 1
	2.	No infinite loops
	3.	Structured deviation log

⸻

🔁 Handoff

PM → Knowledge Curator → Developer → PM

⸻

🧩 TASK S8-8 — Compliance Ledger

Request Metadata
	•	Ticket ID: AGSYS-COMP-008
	•	Pipeline: refactor

⸻

Business Goal

Зберігати план vs факт.

⸻

Acceptance Criteria
	1.	Ledger містить:

{
  "plan": {},
  "actual": {},
  "deviation": {}
}

	2.	Прив’язка до runId
	3.	Використовується для audit

⸻

🔁 Handoff

PM → Documentation Owner → Developer → Audit Agent → PM

⸻

🧩 TASK S8-9 — Runtime Integration (Plan + Execution)

Request Metadata
	•	Ticket ID: AGSYS-COMP-009
	•	Pipeline: sprint-integration

⸻

Business Goal

Зв’язати план з runtime execution.

⸻

Acceptance Criteria
	1.	Runtime читає plan
	2.	Runtime передає plan в governance
	3.	Execution слідує plan

⸻

🔁 Handoff

PM → Solution Architect → Developer → TDD QA → PM

⸻

🧩 TASK S8-10 — End-to-End Compliance Scenario

Request Metadata
	•	Ticket ID: AGSYS-COMP-010
	•	Pipeline: sprint-integration

⸻

Business Goal

Перевірити повний цикл.

⸻

Scenario
	1.	Task: bug-fix
	2.	Plan:
	•	developer + tdd-qa
	3.	Execution:
	•	пропущений QA
	4.	System:
	•	retry
	•	лог

⸻

Acceptance Criteria
	1.	Mismatch детектиться
	2.	Retry працює
	3.	Ledger фіксує deviation
	4.	Scenario reproducible

⸻

🔁 Handoff

PM → TDD QA → Developer → Audit Agent → PM

⸻

🧠 Порядок виконання
	1.	S8-1 → S8-2
	2.	S8-3
	3.	S8-4 → S8-5 → S8-6
	4.	S8-7
	5.	S8-8
	6.	S8-9
	7.	S8-10

⸻

🚀 Що ти отримуєш після Sprint 8

👉 система перестає бути “LLM driven” повністю

👉 стає:

Execution-by-Plan System

⸻

🔥 Найважливіший результат
	•	система знає що робити
	•	система перевіряє чи правильно зроблено
	•	система змушує виправляти помилки

⸻
