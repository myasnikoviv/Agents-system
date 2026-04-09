🟦 Sprint 20 — Cockpit UI for Real Multi-Agent Runtime

⸻

🎯 Goal

Оновити Cockpit UI так, щоб він:
	•	відображав реальний distributed runtime (Sprint 19)
	•	показував agent lifecycle (hot/cold + active/standby)
	•	давав повну прозорість:
	•	worker state
	•	queue
	•	dispatch
	•	project isolation

⸻

🧠 Core Insight

Sprint 19 створює runtime
Sprint 20 робить його видимим і контрольованим

⸻

🧩 EPICS

⸻

🟫 EPIC 1 — Swarm Controller 2.0 (Real Workers)

⸻

🎫 S20-1 — Worker State Model UI Integration

Business Goal

Відобразити реальний стан worker-а (а не імітацію)

⸻

Scope
	•	включає:
	•	hot / cold
	•	active / standby
	•	lifecycle states
	•	виключає:
	•	spawn logic

⸻

Acceptance Criteria
	•	В UI видно:
	•	hot / cold
	•	active / standby
	•	starting / stopping / failed
	•	Дані беруться з backend contract (S19)
	•	standby ≠ cold

⸻

Handoff

PM → Frontend Dev → Runtime Engineer → QA → PM

⸻

⸻

🎫 S20-2 — Worker Identity Rendering

Business Goal

Показати project-scoped worker identity

⸻

Acceptance Criteria
	•	В UI видно:
	•	projectId
	•	agentSlug
	•	workerId
	•	Один agentSlug в різних проектах відображається як різні сутності
	•	Нема змішування між проектами

⸻

⸻

🎫 S20-3 — Worker Health & Heartbeat View

Business Goal

Відображати реальний health

⸻

Acceptance Criteria
	•	В UI видно:
	•	last heartbeat timestamp
	•	health status
	•	Stale worker позначається як degraded / dead
	•	Дані оновлюються в realtime

⸻

⸻

🟩 EPIC 2 — Multiple Mode Visibility

⸻

🎫 S20-4 — Execution Mode Indicator

Business Goal

Чітко показати режим

⸻

Acceptance Criteria
	•	UI показує:
	•	quasi-linear
	•	multiple_agents
	•	Для multiple:
	•	показується “distributed runtime active”
	•	Mode change відображається без reload

⸻

⸻

🎫 S20-5 — Parallel Execution Indicator

Business Goal

Показати, що агенти реально працюють паралельно

⸻

Acceptance Criteria
	•	UI показує ≥2 active workers одночасно
	•	В timeline видно overlap execution
	•	Є indicator “parallel execution”

⸻

⸻

🟪 EPIC 3 — Project-Scoped Runtime View

⸻

🎫 S20-6 — Project Agent Roster

Business Goal

Показати agent set для конкретного проекту

⸻

Acceptance Criteria
	•	Видно список агентів проекту
	•	Видно:
	•	enabled
	•	hot
	•	cold
	•	Не видно агентів інших проектів

⸻

⸻

🎫 S20-7 — Project Switch Feedback

Business Goal

Відобразити runtime зміни при switch

⸻

Acceptance Criteria
	•	При switch видно:
	•	worker spawn
	•	worker demotion
	•	Нема memory bleed
	•	Є loading/transition state

⸻

⸻

🟧 EPIC 4 — Queue & Dispatch Panel

⸻

🎫 S20-8 — Task Queue Visualization

Business Goal

Показати чергу задач

⸻

Acceptance Criteria
	•	Видно:
	•	queue length
	•	waiting tasks
	•	Видно project scope
	•	Дані realtime

⸻

⸻

🎫 S20-9 — Task Assignment View

Business Goal

Показати, хто взяв задачу

⸻

Acceptance Criteria
	•	Видно:
	•	task → worker mapping
	•	Видно статус:
	•	pending
	•	assigned
	•	completed

⸻

⸻

🎫 S20-10 — Dispatch Latency Indicator

Business Goal

Показати затримки

⸻

Acceptance Criteria
	•	Видно час між:
	•	enqueue
	•	pickup
	•	Є warning якщо latency > threshold

⸻

⸻

🟥 EPIC 5 — Lifecycle & Resource View

⸻

🎫 S20-11 — Worker Lifecycle Timeline

Business Goal

Відобразити lifecycle

⸻

Acceptance Criteria
	•	Видно:
	•	spawn
	•	active
	•	idle
	•	stop
	•	Інтеграція з timeline

⸻

⸻

🎫 S20-12 — Resource State Indicators

Business Goal

Показати load

⸻

Acceptance Criteria
	•	Видно:
	•	active workers
	•	hot workers
	•	queue pressure
	•	Є warning при overload

⸻

⸻

🟦 EPIC 6 — Debug & Runtime Transparency (Extension of Sprint 18)

⸻

🎫 S20-13 — Worker-level Debug Logs

Business Goal

Дебаг на рівні worker-а

⸻

Acceptance Criteria
	•	Видно:
	•	worker-specific logs
	•	Привʼязка до workerId

⸻

⸻

🎫 S20-14 — Execution Trace per Worker

Business Goal

Trace execution

⸻

Acceptance Criteria
	•	Видно:
	•	steps per worker
	•	Видно:
	•	tool usage
	•	LLM calls

⸻

⸻

🧠 Definition of Done (Sprint 20)

⸻

Спринт завершений, якщо:
	•	UI показує реальні worker-и
	•	видно hot/cold + active/standby
	•	видно queue і dispatch
	•	видно project isolation
	•	видно parallel execution
	•	swarm controller відповідає реальному runtime

⸻

💥 Ключовий результат

Після Sprint 20:

👉 ти відкриваєш Cockpit і одразу бачиш:
	•	хто працює
	•	що робить
	•	чому чекає
	•	де bottleneck
	•	чи реально multi-agent

⸻

🚀 Важливий інсайт

До цього моменту:

система існувала, але ти не міг її “побачити”

Після Sprint 20:

ти керуєш нею як distributed system

⸻