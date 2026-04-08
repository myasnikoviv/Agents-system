🟦 Sprint 20 — FINAL VALIDATION PACK (Cockpit UI for Real Multi-Agent Runtime)

🎯 Ціль перевірки

Підтвердити, що Cockpit UI:
	•	показує реальний distributed runtime, а не derived/simulated state;
	•	коректно відображає:
	•	worker lifecycle,
	•	project isolation,
	•	queue/dispatch,
	•	parallel execution;
	•	готовий бути операційною панеллю для multiple_agents mode.  ￼

⸻

🧩 SECTION 1 — Swarm Controller Truthfulness

1.1 Real Worker State
	•	Чи UI показує реальні worker-и, а не умовні agent labels?
	•	Чи дані приходять із backend contract Sprint 19?
	•	Чи standby НЕ використовується як синонім cold?

1.2 State Dimensions
	•	Чи в UI окремо видно:
	•	hot / cold
	•	active / standby
	•	starting / stopping / failed
	•	Чи можна одночасно побачити availability state і execution state?

1.3 Worker Identity
	•	Чи UI показує:
	•	projectId
	•	agentSlug
	•	workerId
	•	Чи один agentSlug у різних проєктах відображається як різні сутності?

⸻

🧩 SECTION 2 — Heartbeat & Health

2.1 Heartbeat Visibility
	•	Чи видно last heartbeat timestamp?
	•	Чи дані оновлюються в realtime?

2.2 Health Truthfulness
	•	Чи stale worker позначається як degraded/dead?
	•	Чи health state не базується лише на “останній події в стрімі”?

2.3 Failure Reflection
	•	Чи worker у стані failed реально відображається в UI?
	•	Чи можна побачити, що worker випав із swarm?

⸻

🧩 SECTION 3 — Multiple Mode Visibility

3.1 Mode Indicator
	•	Чи UI явно показує:
	•	quasi-linear
	•	multiple_agents
	•	Чи при multiple_agents є індикатор, що це саме distributed runtime?

3.2 Parallel Execution
	•	Чи UI показує ≥2 active workers одночасно?
	•	Чи timeline показує overlap execution?
	•	Чи є окремий indicator “parallel execution active”?

3.3 No Fake Multiple Mode
	•	Чи UI не вводить в оману, коли backend насправді працює quasi-linear?
	•	Чи є доказ, що UI не просто показує “багато агентів”, коли реально працює один процес?

⸻

🧩 SECTION 4 — Project-Scoped Runtime View

4.1 Project Agent Roster
	•	Чи видно agent set тільки для вибраного проєкту?
	•	Чи видно для кожного агента:
	•	enabled
	•	hot
	•	cold

4.2 Project Isolation
	•	Чи UI не змішує агентів між проєктами?
	•	Чи при перемиканні проєкту roster змінюється коректно?

4.3 Switch Feedback
	•	Чи при switch видно:
	•	worker spawn
	•	worker demotion
	•	loading / transition state
	•	Чи немає “memory bleed” у візуалізації?

⸻

🧩 SECTION 5 — Queue & Dispatch Panel

5.1 Queue Visibility
	•	Чи видно:
	•	queue length
	•	waiting tasks
	•	project scope
	•	Чи дані оновлюються в realtime?

5.2 Task Assignment
	•	Чи видно mapping:
	•	task → worker
	•	Чи видно статуси:
	•	pending
	•	assigned
	•	completed

5.3 Dispatch Latency
	•	Чи UI показує час між:
	•	enqueue
	•	pickup
	•	Чи є warning при перевищенні threshold?

5.4 No Hidden Bottlenecks
	•	Чи можна по UI зрозуміти, чому задача чекає?
	•	Чи видно, де bottleneck:
	•	queue
	•	worker shortage
	•	stalled worker

⸻

🧩 SECTION 6 — Lifecycle & Resource View

6.1 Lifecycle Timeline
	•	Чи видно lifecycle worker-а:
	•	spawn
	•	active
	•	idle
	•	stop
	•	Чи інтегровано це з timeline?

6.2 Resource Indicators
	•	Чи видно:
	•	active workers
	•	hot workers
	•	queue pressure
	•	Чи є warning при overload?

6.3 Runtime Pressure Truthfulness
	•	Чи ці індикатори базуються на реальному backend state?
	•	Чи не є це mock/derived UI-only counters?

⸻

🧩 SECTION 7 — Debug & Worker Transparency

7.1 Worker-level Debug Logs
	•	Чи видно worker-specific logs?
	•	Чи є прив’язка до workerId?

7.2 Execution Trace per Worker
	•	Чи видно execution trace по кожному worker-у?
	•	Чи видно:
	•	tool usage
	•	LLM calls
	•	per-step progression

7.3 Debugability
	•	Чи можна по UI знайти, який саме worker зламався?
	•	Чи можна відрізнити worker issue від queue issue?

⸻

🧩 SECTION 8 — Real-time Correctness

8.1 Live Updates
	•	Чи UI оновлюється без reload?
	•	Чи немає дублювання подій?

8.2 Consistency Under Load
	•	Чи UI коректно працює, коли одночасно працюють кілька worker-ів?
	•	Чи не втрачаються події?

8.3 Ordering
	•	Чи порядок подій у UI відповідає реальному runtime order?
	•	Чи немає “перестрибування” станів?

⸻

🧩 SECTION 9 — Integration with Sprint 18

9.1 Timeline Compatibility
	•	Чи новий worker/runtime UI інтегрується з existing observability timeline?
	•	Чи немає конфлікту між old execution timeline і worker-specific timeline?

9.2 Governance Visibility Compatibility
	•	Чи governance / loops / planning view не ламаються після переходу до real multiple runtime?

9.3 Unified Cockpit
	•	Чи Cockpit виглядає як одна цілісна система, а не як набір окремих панелей?

⸻

🧩 SECTION 10 — Final Reality Check

❗ Питання 1
	•	Чи користувач може, відкривши Cockpit, одразу зрозуміти:
	•	хто працює
	•	що робить
	•	чому чекає
	•	де bottleneck
	•	чи реально multiple_agents активний?

❗ Питання 2
	•	Чи UI допомагає дебажити distributed system, а не тільки “дивитися на статуси”?

❗ Питання 3
	•	Чи Cockpit не вводить в оману щодо реального runtime state?

❗ Питання 4
	•	Чи можна назвати цей UI “операційною панеллю”, а не просто debug sidebar?

⸻

🧾 REQUIRED OUTPUT FORMAT

Агент має повернути по кожному пункту:
	•	Status: DONE / PARTIAL / NOT DONE
	•	Evidence:
	•	exact UI surface / component
	•	backend contract used
	•	logs / screenshots / runtime traces
	•	Test:
	•	scenario
	•	how validated
	•	Gaps:
	•	what is missing

⸻

Обов’язковий фінальний блок

## Sprint 20 Status Summary

Overall: READY / PARTIAL / NOT READY

### Completed
- ...

### Critical Gaps
- ...

### Misleading UI Risks
- ...

### Blockers before Sprint 21
- ...

### Recommendation
- proceed / fix first


⸻

💥 Ключовий критерій Sprint 20

Sprint 20 вважається успішним, якщо:
	•	UI показує реальних worker-ів;
	•	видно hot/cold + active/standby;
	•	видно queue і dispatch;
	•	видно project isolation;
	•	видно parallel execution;
	•	swarm controller відповідає реальному runtime, а не імітації.  ￼

⸻

Найважливіше

Цей аудит перевіряє не “чи є панелі”, а:

❗ чи став Cockpit справжньою операційною панеллю для distributed agent system
