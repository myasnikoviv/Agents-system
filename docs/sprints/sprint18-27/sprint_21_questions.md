🟥 Sprint 21 — FINAL VALIDATION PACK (Control Plane)

🎯 Ціль перевірки

Підтвердити, що система:
	•	дає реальний контроль над execution, а не “UI-кнопки без ефекту”;
	•	всі дії:
	•	deterministic
	•	traceable
	•	безпечні;
	•	control plane реально впливає на runtime зі Sprint 19.

⸻

🧩 SECTION 1 — Worker Control (Core Control Plane)

⸻

1.1 Pause / Resume Worker
	•	Чи pause:
	•	реально блокує нові задачі?
	•	НЕ тільки UI state?
	•	Чи worker:
	•	завершує поточну задачу?
	•	або freeze (якщо включено)?
	•	Чи resume:
	•	повертає worker в dispatch?
	•	він реально бере задачі після resume?

⸻

🔥 КРИТИЧНЕ
	•	Чи pause впливає на реальний execution, а не тільки UI?

⸻

1.2 Kill / Restart Worker
	•	Чи kill:
	•	реально завершує процес / worker instance?
	•	Чи restart:
	•	створює НОВИЙ workerId?
	•	не перевикористовує старий state?
	•	Чи lifecycle відображається:
	•	killed → starting → hot

⸻

🔥 КРИТИЧНЕ
	•	Чи немає zombie workers після kill?

⸻

1.3 Worker Isolation після Restart
	•	Чи новий worker:
	•	НЕ має старого контексту?
	•	НЕ має старих locks / tasks?

⸻

🧩 SECTION 2 — Task Control

⸻

2.1 Retry Task
	•	Чи retry:
	•	створює новий executionId?
	•	не перезаписує старий?
	•	Чи видно retry count?

⸻

2.2 Cancel Task
	•	Чи cancel:
	•	реально зупиняє execution?
	•	worker перестає виконувати task?
	•	Чи task:
	•	зникає з queue?
	•	отримує статус cancelled?

⸻

🔥 КРИТИЧНЕ
	•	Чи LLM виклики реально припиняються?

⸻

2.3 Task Priority Override
	•	Чи priority:
	•	реально впливає на dispatch?
	•	Чи queue reorder:
	•	відображається і працює?

⸻

🧩 SECTION 3 — Governance Overrides

⸻

3.1 Manual Override for Gates
	•	Чи можна override:
	•	preflight
	•	postflight
	•	governance rule
	•	Чи override:
	•	реально дозволяє execution піти далі?

⸻

🔥 КРИТИЧНЕ
	•	Чи override НЕ просто “UI allow”, а реально bypass runtime logic?

⸻

3.2 Override Audit
	•	Чи логиться:
	•	user
	•	timestamp
	•	reason
	•	Чи видно override в timeline?

⸻

3.3 Safety
	•	Чи override:
	•	не ламає систему?
	•	не створює inconsistent state?

⸻

🧩 SECTION 4 — Loop Control

⸻

4.1 Force Loop Execution
	•	Чи можна вручну запустити:
	•	improvement loop
	•	validation loop
	•	Чи loop:
	•	реально запускається поза основним flow?

⸻

4.2 Loop Effects
	•	Чи видно:
	•	результат loop
	•	створені артефакти?

⸻

🔥 КРИТИЧНЕ
	•	Чи loop НЕ є просто LLM викликом без інтеграції в систему?

⸻

🧩 SECTION 5 — Routing Control

⸻

5.1 Manual Agent Selection
	•	Чи можна вручну вибрати:
	•	agent
	•	pipeline
	•	Чи runtime:
	•	реально використовує цей вибір?

⸻

🔥 КРИТИЧНЕ
	•	Чи routing НЕ ігнорує manual selection?

⸻

5.2 Skill / Pipeline Enforcement
	•	Чи можна змусити:
	•	використовувати конкретний pipeline?
	•	конкретний skill?
	•	Чи runtime:
	•	перевіряє використання?

⸻

🔥 КРИТИЧНЕ
	•	Чи система падає/зупиняється, якщо skill не використаний?

⸻

🧩 SECTION 6 — Swarm Control

⸻

6.1 Bulk Worker Control
	•	Чи працює:
	•	pause all
	•	kill all
	•	restart group
	•	Чи це:
	•	реально впливає на всі worker-и?

⸻

6.2 Project-level Control
	•	Чи можна:
	•	pause project
	•	resume project
	•	clear queue

⸻

🔥 КРИТИЧНЕ
	•	Чи project control не залишає “висячі” worker-и?

⸻

🧩 SECTION 7 — Safety & Audit

⸻

7.1 Action Audit Log
	•	Чи логуються всі дії:
	•	pause
	•	kill
	•	override
	•	routing change
	•	Чи є:
	•	user
	•	timestamp
	•	reason

⸻

7.2 Full Traceability
	•	Чи можна відновити:
	•	хто і що зробив?

⸻

7.3 UI Safeguards
	•	Чи є confirm dialogs для:
	•	kill
	•	override
	•	dangerous actions

⸻

🔥 КРИТИЧНЕ
	•	Чи неможливо випадково вбити swarm?

⸻

🧩 SECTION 8 — Integration with Runtime (Sprint 19)

⸻

8.1 Real Effect on Workers
	•	Чи всі control actions:
	•	реально впливають на worker processes?

⸻

8.2 Queue Integration
	•	Чи control:
	•	впливає на dispatch / queue?

⸻

8.3 No Fake Control
	•	Чи UI не “імітує” control без backend ефекту?

⸻

🧩 SECTION 9 — Integration with UI (Sprint 20)

⸻

9.1 State Sync
	•	Чи всі control actions:
	•	миттєво відображаються в UI?

⸻

9.2 No UI Drift
	•	Чи UI не показує старий стан після control?

⸻

9.3 Real-time Feedback
	•	Чи користувач бачить результат дії:
	•	pause → worker зупинився
	•	kill → worker зник

⸻

🧩 SECTION 10 — Failure & Edge Cases

⸻

10.1 Kill During Execution
	•	Чи task:
	•	не зависає?
	•	переходить у consistent state?

⸻

10.2 Retry після Failure
	•	Чи retry:
	•	не використовує corrupted context?

⸻

10.3 Override + Loop
	•	Чи override не ламає loop execution?

⸻

🧩 SECTION 11 — Final Reality Check

⸻

❗ Питання 1
	•	Чи ти реально керуєш системою, а не просто дивишся?

⸻

❗ Питання 2
	•	Чи система поводиться як:
	•	distributed system (Kubernetes/Ray-style)?

⸻

❗ Питання 3
	•	Чи можна:
	•	вручну виправити проблему без зміни коду?

⸻

❗ Питання 4
	•	Чи control plane дозволяє:
	•	стабілізувати систему під навантаженням?

⸻

🧾 REQUIRED OUTPUT

Агент має повернути:

## Sprint 21 Validation Report

Overall: READY / PARTIAL / NOT READY

### Worker Control
...

### Task Control
...

### Governance Control
...

### Routing Control
...

### Audit & Safety
...

### Critical Gaps
...

### Fake Control Risks
...

### Recommendation
...


⸻

💥 Ключовий критерій Sprint 21

Спринт завершений тільки якщо:

❗ кожна дія користувача реально змінює стан системи

⸻

⚠️ Дуже важливий момент (з твого кейсу)

Твоя система вже має проблему:

👉 “multiple_agents насправді quasi-linear”

Тому тут головна перевірка:

❗ чи control layer працює поверх реального distributed runtime, а не симуляції

⸻
