Супер, тепер робимо Sprint 7 → повний Plane-ready пакет, строго у вашому форматі + з урахуванням:
	•	вашого intake template  ￼
	•	ролей / pipeline / handoff моделі  ￼

👉 без теорії, тільки те, що реально імплементиться

⸻

🟫 SPRINT 7 — Workbench Governance

⸻

🧩 TASK S7-1 — Workbench Core Entry Point (Tool Gateway)

Request Metadata
	•	Ticket ID: AGSYS-WB-001
	•	Project: AGSYS
	•	Pipeline: refactor
	•	Owner: Сокіл-Координатор (PM Orchestrator)

⸻

Business Goal

Забезпечити, що всі tool виклики проходять через Workbench, а не напряму.

⸻

Scope
	•	Included:
	•	Workbench entry point
	•	interception tool calls
	•	Excluded:
	•	full concurrency logic
	•	UI

⸻

User Scenarios
	1.	Agent викликає tool → запит іде через Workbench
	2.	Прямий виклик tool без Workbench → блокується

⸻

Constraints
	•	Technical:
	•	Workbench = single gateway
	•	Operational:
	•	backward compatibility мінімальна
	•	Timeline:
	•	MVP routing only

⸻

Acceptance Criteria
	1.	Всі tool calls проходять через Workbench layer
	2.	Прямі виклики tool не виконуються
	3.	Workbench отримує:
	•	agentId
	•	toolId
	•	runId

⸻

Risks
	•	Risk:
	•	не всі tool paths перехоплені

⸻

🔁 Handoff Protocol

PM → Solution Architect → Developer → Audit Agent → PM

⸻

🧩 TASK S7-2 — Tool Registry (Static MVP)

Request Metadata
	•	Ticket ID: AGSYS-WB-002
	•	Pipeline: refactor

⸻

Business Goal

Створити централізований опис інструментів.

⸻

Scope
	•	Included:
	•	static registry
	•	Excluded:
	•	dynamic config

⸻

Acceptance Criteria
	1.	Кожен tool має:

{
  "id": "",
  "type": "parallel|exclusive|isolated",
  "allowedAgents": []
}

	2.	Registry доступний runtime

⸻

🔁 Handoff

Architect → Developer → Documentation Owner → PM

⸻

🧩 TASK S7-3 — Access Control (Agent → Tool)

Request Metadata
	•	Ticket ID: AGSYS-WB-003
	•	Pipeline: feature-change

⸻

Business Goal

Контролювати, хто може використовувати tool.

⸻

User Scenarios
	1.	Agent allowed → tool використовується
	2.	Agent forbidden → block

⸻

Acceptance Criteria
	1.	Перевіряється allowedAgents
	2.	Forbidden usage → block + log
	3.	Governance log створюється

⸻

🔁 Handoff

PM → Audit Agent → Developer → PM

⸻

🧩 TASK S7-4 — Concurrency Manager (Exclusive Tools)

Request Metadata
	•	Ticket ID: AGSYS-WB-004
	•	Pipeline: bug-fix

⸻

Business Goal

Запобігти конфліктам при використанні ресурсів.

⸻

Scope
	•	Included:
	•	exclusive lock
	•	Excluded:
	•	advanced scheduling

⸻

Acceptance Criteria
	1.	Exclusive tool:
	•	тільки 1 агент
	2.	Другий агент:
	•	не отримує доступ
	3.	Lock звільняється після виконання

⸻

🔁 Handoff

Architect → Developer → TDD QA → PM

⸻

🧩 TASK S7-5 — Queue System (Exclusive Tools)

Request Metadata
	•	Ticket ID: AGSYS-WB-005
	•	Pipeline: feature-change

⸻

Business Goal

Дати можливість чекати доступ до tool.

⸻

Acceptance Criteria
	1.	Якщо tool зайнятий:
	•	агент стає в чергу
	2.	FIFO порядок
	3.	Tool видається наступному агенту

⸻

🔁 Handoff

PM → Developer → TDD QA → PM

⸻

🧩 TASK S7-6 — Parallel / Isolated Execution Support

Request Metadata
	•	Ticket ID: AGSYS-WB-006
	•	Pipeline: feature-change

⸻

Business Goal

Підтримати різні режими використання tools.

⸻

Acceptance Criteria
	1.	Parallel:
	•	кілька агентів одночасно
	2.	Isolated:
	•	окремий workspace
	3.	No cross-contamination

⸻

🔁 Handoff

Architect → Developer → Audit Agent → PM

⸻

🧩 TASK S7-7 — Workbench Telemetry Collector

Request Metadata
	•	Ticket ID: AGSYS-WB-007
	•	Pipeline: unified-task-intake

⸻

Business Goal

Збирати usage data для аналізу.

⸻

Acceptance Criteria
	1.	Логується:
	•	agentId
	•	toolId
	•	start/end time
	2.	Прив’язка до runId
	3.	Дані доступні governance

⸻

🔁 Handoff

DevOps → Developer → Audit Agent → PM

⸻

🧩 TASK S7-8 — Workbench → Governance Integration

Request Metadata
	•	Ticket ID: AGSYS-WB-008
	•	Pipeline: refactor

⸻

Business Goal

Зробити Workbench джерелом evidence.

⸻

Acceptance Criteria
	1.	Tool usage передається в Governance Engine
	2.	Дані використовуються для:
	•	agent usage
	•	pipeline checks
	3.	Governance бачить реальний usage

⸻

🔁 Handoff

PM → Solution Architect → Developer → Audit Agent → PM

⸻

🧩 TASK S7-9 — Enforce “No Direct Tool Access”

Request Metadata
	•	Ticket ID: AGSYS-WB-009
	•	Pipeline: bug-fix

⸻

Business Goal

Заборонити обход Workbench.

⸻

Acceptance Criteria
	1.	Прямий доступ до tools:
	•	не працює
	2.	Всі tool paths переведені через Workbench
	3.	Є error/log при обході

⸻

🔁 Handoff

PM → Audit Agent → Developer → PM

⸻

🧩 TASK S7-10 — End-to-End Workbench Scenario

Request Metadata
	•	Ticket ID: AGSYS-WB-010
	•	Pipeline: sprint-integration

⸻

Business Goal

Перевірити систему в реальному сценарії.

⸻

User Scenario
	1.	2 агенти → один tool (exclusive)
	2.	Один отримує доступ
	3.	Другий чекає
	4.	Потім виконується

⸻

Acceptance Criteria
	1.	Queue працює
	2.	Lock працює
	3.	Telemetry записана
	4.	Governance отримав дані

⸻

🔁 Handoff

PM → TDD QA → Developer → Audit Agent → PM

⸻

🧠 Порядок виконання
	1.	S7-1 → S7-2
	2.	S7-3
	3.	S7-4 → S7-5
	4.	S7-6
	5.	S7-7
	6.	S7-8
	7.	S7-9
	8.	S7-10

⸻

🚀 Що ти отримуєш після Sprint 7

👉 реальний контроль execution:
	•	немає хаотичного використання tools
	•	немає конфліктів
	•	є telemetry
	•	є evidence для governance

⸻
