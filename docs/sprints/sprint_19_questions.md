🟥 Sprint 19 — FINAL VALIDATION PACK (Multi-Agent Runtime)

⸻

🎯 Ціль перевірки

Підтвердити, що:

❗ multiple_agents = реальний distributed runtime,
а не quasi-linear імітація

⸻

🧩 SECTION 1 — Architecture Truth Check

1.1 Runtime Model
	•	Чи існує окремий worker runtime, а не один orchestrator?
	•	Чи виконується код агентів НЕ в одному процесі?
	•	Чи є розділення:
	•	orchestrator
	•	workers
	•	queue

⸻

1.2 Execution Mode Separation
	•	Чи quasi-linear і multiple_agents використовують різні execution backends?
	•	Чи можна технічно довести (через logs/events), що:
	•	multiple_agents НЕ fallback до single process?

⸻

1.3 Project Isolation
	•	Чи має кожен агент project-scoped identity?
	•	Чи memory namespace включає projectId?
	•	Чи відсутнє cross-project contamination?

⸻

🧩 SECTION 2 — Worker Model Validation

⸻

2.1 Worker Existence
	•	Чи створюються worker instances?
	•	Чи кожен worker має:
	•	workerId
	•	agentSlug
	•	projectId

⸻

2.2 Worker Lifecycle
	•	Чи підтримуються стани:
	•	cold
	•	hot
	•	active
	•	standby
	•	starting
	•	stopping
	•	failed

⸻

2.3 Lifecycle Transitions
	•	Чи є детерміновані переходи:
	•	cold → hot → active → standby → cold
	•	Чи логуються transitions?

⸻

2.4 Worker Independence
	•	Чи можуть 2 worker-и працювати одночасно?
	•	Чи є докази паралельного виконання?

⸻

🧩 SECTION 3 — Queue & Dispatch

⸻

3.1 Queue Architecture
	•	Чи існує queue per project?
	•	Чи задачі НЕ виконуються напряму orchestrator-ом?

⸻

3.2 Task Flow
	•	Чи проходить задача через:
	•	enqueue
	•	dispatch
	•	pickup worker-ом

⸻

3.3 Dispatch Logic
	•	Чи worker сам забирає задачу?
	•	Чи dispatch НЕ централізований в одному runtime?

⸻

3.4 Queue Isolation
	•	Чи задачі різних проектів не змішуються?

⸻

🧩 SECTION 4 — Real Parallel Execution (CRITICAL)

⸻

🔥 ОБОВʼЯЗКОВИЙ TEST

Scenario

Запусти:

1 запит → який викликає мінімум 2 різних агенти
у multiple_agents режимі

⸻

Перевірити:
	•	Чи одночасно активні ≥2 worker-и
	•	Чи execution overlap у часі
	•	Чи немає sequential blocking

⸻

Evidence
	•	logs
	•	timestamps
	•	workerIds

⸻

🧩 SECTION 5 — Heartbeat & Monitoring

⸻

5.1 Heartbeat
	•	Чи кожен worker шле heartbeat?
	•	Чи є timestamp останнього heartbeat?

⸻

5.2 Health Detection
	•	Чи система визначає:
	•	stale worker
	•	dead worker

⸻

5.3 Recovery
	•	Чи система реагує на dead worker?
	•	restart / mark failed

⸻

🧩 SECTION 6 — Resource Management

⸻

6.1 Worker Limits
	•	Чи є:
	•	max workers per project
	•	global limit

⸻

6.2 Idle Management
	•	Чи worker переходить в standby?
	•	Чи є timeout?

⸻

6.3 Cold/Hot Logic
	•	Чи існує різниця між:
	•	loaded vs unloaded agent

⸻

🧩 SECTION 7 — Project Switch Behavior

⸻

7.1 Runtime реакція
	•	Що відбувається при switch project?
	•	spawn?
	•	reuse?
	•	unload?

⸻

7.2 Isolation
	•	Чи немає memory leakage при switch?

⸻

7.3 Worker State
	•	Чи inactive project не тримає зайві worker-и?

⸻

🧩 SECTION 8 — Swarm Controller Contract (Backend)

⸻

8.1 Data Truthfulness
	•	Чи swarm controller показує:
	•	реальні worker-и?
	•	а не derived events?

⸻

8.2 Fields
	•	Чи доступні:
	•	workerId
	•	agentSlug
	•	projectId
	•	state
	•	heartbeat
	•	assigned task

⸻

🧩 SECTION 9 — Telemetry

⸻

9.1 Agent Usage
	•	Чи логиться:
	•	invocation count
	•	execution time

⸻

9.2 Cold Starts
	•	Чи логиться cold start?

⸻

9.3 Idle Time
	•	Чи є idle tracking?

⸻

🧩 SECTION 10 — Failure Modes

⸻

10.1 Worker Crash
	•	Що відбувається при crash?

⸻

10.2 Task Recovery
	•	Чи task:
	•	губиться?
	•	retry?
	•	reassign?

⸻

10.3 Queue Safety
	•	Чи нема втрати задач?

⸻

🧩 SECTION 11 — Determinism vs LLM Behavior

⸻

🔥 КЛЮЧОВЕ ПИТАННЯ

Для кожного елемента:
	•	Це:
	•	deterministic (код)
	•	чи LLM-driven?

⸻

Особливо:
	•	routing
	•	dispatch
	•	worker selection

⸻

🧩 SECTION 12 — Final Reality Check

⸻

❗ Питання

1
	•	Чи система реально працює як distributed system?

⸻

2
	•	Чи можна повністю вимкнути LLM і runtime все одно буде працювати (queue, workers, dispatch)?

⸻

3
	•	Чи є хоч одна частина, яка лише “імітує multi-agent”?

⸻

⸻

🧾 REQUIRED OUTPUT FORMAT

⸻

Агент має повернути:

⸻

1. Summary
	•	✅ Ready / ⚠️ Partial / ❌ Not ready

⸻

2. Evidence-based answers

(не “так/ні”, а з доказами)

⸻

3. Critical gaps

⸻

4. Risk level
	•	Low / Medium / High

⸻

5. Recommendation
	•	можна йти до Sprint 20/21?
	•	чи треба фіксити?

⸻

💥 Найважливіше

Це не чекліст “для галочки”.

Це питання:

❗ “Чи ми реально перейшли від AI-чатіка до distributed system?”

⸻
