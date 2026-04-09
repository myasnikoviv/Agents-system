🟦 Sprint 18 — Epics Breakdown

⸻

🧩 Epic 1 — Execution Timeline & Live Runtime View

👉 Відображення повного execution процесу (як у Codex)

⸻

🧩 Epic 2 — Governance & Evaluator Visibility

👉 Прозорість правил, evaluator-ів і enforcement

⸻

🧩 Epic 3 — Loops & Control Flow Visibility

👉 Відображення verification / retry / improvement loop-ів

⸻

🧩 Epic 4 — Planning & Execution Contract View

👉 Відображення execution plan + контроль його дотримання

⸻

🧩 Epic 5 — Workbench & Tool Usage Panel

👉 Інструменти, черги, паралельність

⸻

🧩 Epic 6 — Cost & Token Observability

👉 Контроль витрат

⸻

🧩 Epic 7 — Debug & Prompt Inspection Mode

👉 Глибокий дебаг системи

⸻

⸻

🟨 EPIC 1 — Execution Timeline

⸻

🎫 T1 — Event Timeline Component

Description

Реалізувати timeline execution:
	•	agent started
	•	stage entered
	•	tool used
	•	handoff
	•	stage completed

⸻

Acceptance Criteria
	•	Події відображаються у хронологічному порядку
	•	Є тип події (handoff / tool / stage)
	•	Є agent source
	•	Є timestamp
	•	Дані беруться з EventBus

⸻

Handoff
	•	Frontend Dev → Runtime Engineer (event format validation)

⸻

⸻

🎫 T2 — Handoff Visualization

Description

Візуалізувати передачу між агентами

⸻

Acceptance Criteria
	•	Видно agent → agent transition
	•	Відображається роль
	•	Відображається причина (stage / routing)

⸻

⸻

🎫 T3 — Live Execution Mode

Description

Реалізувати live streaming execution

⸻

Acceptance Criteria
	•	UI оновлюється без reload
	•	Події приходять стрімом
	•	Немає дублювання

⸻

⸻

🟩 EPIC 2 — Governance Panel

⸻

🎫 T4 — Rule Execution View

Description

Показати:
	•	rule
	•	evaluator
	•	результат

⸻

Acceptance Criteria
	•	Кожне правило видно
	•	Видно PASS / FAIL
	•	Видно evaluator name

⸻

⸻

🎫 T5 — Violation & Enforcement View

Description

Показати:
	•	block
	•	retry
	•	escalate

⸻

Acceptance Criteria
	•	Видно причину
	•	Видно enforcement action
	•	Є зв’язок із rule

⸻

⸻

🟪 EPIC 3 — Loops Panel

⸻

🎫 T6 — Loop Detection & Visualization

Description

Відобразити:
	•	verification loop
	•	retry loop
	•	improvement loop

⸻

Acceptance Criteria
	•	Видно loop type
	•	Видно iteration count
	•	Видно результат

⸻

⸻

🎫 T7 — Loop Timeline Integration

Description

Інтегрувати loops у timeline

⸻

Acceptance Criteria
	•	Loop events в timeline
	•	Видно початок/кінець loop

⸻

⸻

🟦 EPIC 4 — Planning View

⸻

🎫 T8 — Execution Plan Viewer

Description

Відображення JSON plan

⸻

Acceptance Criteria
	•	Видно:
	•	agents
	•	tools
	•	pipelines
	•	JSON readable

⸻

⸻

🎫 T9 — Plan vs Execution Diff

Description

Порівняти plan vs reality

⸻

Acceptance Criteria
	•	Видно missing agents
	•	Видно extra steps
	•	Є indicator mismatch

⸻

⸻

🟫 EPIC 5 — Workbench Panel

⸻

🎫 T10 — Tool Usage Tracking

Description

Показати використання tools

⸻

Acceptance Criteria
	•	Видно tool name
	•	Видно agent
	•	Видно duration

⸻

⸻

🎫 T11 — Tool Concurrency View

Description

Показати queue / blocking

⸻

Acceptance Criteria
	•	Видно waiting agents
	•	Видно active tool
	•	Видно blocking

⸻

⸻

🟧 EPIC 6 — Cost Panel

⸻

🎫 T12 — Token Usage View

Description

Показати токени

⸻

Acceptance Criteria
	•	tokens per run
	•	tokens per agent
	•	tokens per step

⸻

⸻

🎫 T13 — Cost Breakdown

Description

Де витрачаються токени

⸻

Acceptance Criteria
	•	видно найбільш затратні агенти
	•	видно loops cost

⸻

⸻

🟥 EPIC 7 — Debug Mode

⸻

🎫 T14 — Raw Prompt Logging

Description

Показати prompt / response

⸻

Acceptance Criteria
	•	видно prompt
	•	видно response
	•	прив’язка до step

⸻

⸻

🎫 T15 — LLM Call Inspector

Description

Показати всі LLM calls

⸻

Acceptance Criteria
	•	видно provider
	•	видно model
	•	видно latency

⸻

⸻

🎫 T16 — Run Replay Mode

Description

Replay execution

⸻

Acceptance Criteria
	•	можна переграти run
	•	timeline відтворюється

⸻

⸻

🧠 ДУЖЕ ВАЖЛИВО (Handoff правило)

Для ВСІХ задач:

Frontend Dev:
- UI components
- visualization

Runtime Engineer:
- event structure
- data exposure

PM Orchestrator:
- validation сценаріїв
- acceptance check


⸻

🏁 Definition of Done (Sprint 18)

Спринт завершений, якщо:
	•	видно весь execution timeline
	•	видно governance decisions
	•	видно loops
	•	видно planning
	•	видно tools
	•	видно cost
	•	є debug mode

⸻

🚀 Результат

Після цього:

👉 Cockpit = не UI
👉 Cockpit = операційна система
