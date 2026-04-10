Супер, тепер ми вже виходимо на найважливіший шар всієї системи — не просто контроль, а правильність мислення системи.

⸻

🟫 SPRINT 8 — Skill & Pipeline Compliance Engine

⸻

🎯 Мета спринта

Побудувати шар, який:

👉 змушує систему використовувати правильні агенти, скіли та пайплайни для кожної задачі

⸻

🧠 Ключова ідея

LLM не повинна сама вирішувати, як виконувати задачу.
Вона повинна виконувати те, що визначено системою.

⸻

❗ Проблема, яку ми вирішуємо

Зараз навіть після Sprint 6 і 7:

❌ система:
	•	може ігнорувати потрібні pipeline
	•	може не використовувати skills
	•	може виконувати “як вийде”

⸻

👉 Sprint 8 робить:

✅ execution deterministic на рівні процесу

⸻

🧩 Що саме контролюємо

⸻

1. Pipeline Compliance

👉 Чи використано правильний pipeline

⸻

2. Skill Usage

👉 Чи використані потрібні скіли

⸻

3. Agent Selection

👉 Чи залучені правильні агенти

⸻

4. Execution Strategy

👉 Чи правильна послідовність дій

⸻

🧠 Новий шар системи

⸻


User Task
   ↓
Compliance Engine (Sprint 8)
   ↓
Execution Plan (required agents + pipelines + skills)
   ↓
Runtime (Sprint 6 + 7)


⸻

🧩 Основні компоненти

⸻

1. Task Analyzer

👉 аналізує задачу
	•	що це за тип задачі
	•	який pipeline потрібен
	•	які агенти
	•	які скіли

⸻

2. Execution Plan Builder

👉 будує план:

{
  "pipeline": "bug-fix",
  "agents": ["developer", "tdd-qa"],
  "skills": ["write_test", "fix_bug"]
}


⸻

3. Compliance Checker

👉 перевіряє:
	•	чи реально це виконано
	•	чи було відхилення

⸻

4. Enforcement Loop

👉 якщо не виконано:
	•	retry
	•	або override
	•	або justification

⸻

5. Compliance Ledger

👉 лог:
	•	що планувалось
	•	що виконано
	•	де deviation

⸻

🧠 Як це працює (flow)

⸻


User → задача
   ↓
Analyzer → визначає pipeline/agents/skills
   ↓
Plan Builder → створює execution plan
   ↓
Execution
   ↓
Compliance Checker
   ↓
IF mismatch:
   → retry / ask / log


⸻

🔥 ВАЖЛИВИЙ МОМЕНТ

👉 Це НЕ просто “перевірка після”

👉 Це:

pre + during + post control

⸻

📦 Типи контролю

⸻

Pre-execution

👉 “що потрібно зробити”

⸻

During execution

👉 “чи правильно виконується”

⸻

Post-execution

👉 “чи зроблено правильно”

⸻

🧠 Приклад

⸻

User:

“виправ баг”

⸻

Analyzer:

{
  "pipeline": "bug-fix",
  "agents": ["developer", "tdd-qa"],
  "skills": ["reproduce_bug", "write_test", "fix"]
}


⸻

Якщо система:

❌ не використовує TDD QA
❌ не пише тест

⸻

👉 Compliance Engine:
	•	фіксує deviation
	•	робить retry
	•	або вимагає пояснення

⸻

🧠 Чим це відрізняється від Sprint 6

⸻


Sprint 6	Sprint 8
перевіряє факт	визначає як має бути
governance	planning + compliance
rules	execution strategy


⸻

⚙️ Integration

⸻

З Governance Engine
	•	Compliance → додає нові rules
	•	Governance → виконує enforcement

⸻

З Workbench
	•	перевіряє реальне використання tools

⸻

📊 Acceptance Criteria (Sprint Level)

⸻

✔ Correctness
	•	система не виконує задачу без pipeline
	•	система не ігнорує required agents

⸻

✔ Enforcement
	•	mismatch → retry або justification

⸻

✔ Observability
	•	є план execution
	•	є факт execution
	•	є deviation

⸻

✔ Determinism
	•	план будується системою, не LLM хаотично

⸻

⚠️ ЩО НЕ ВХОДИТЬ

⸻

❌ AI auto-planner без правил
❌ повністю автономна стратегія
❌ складні ML моделі

⸻

🧠 Ризики

⸻

1. Over-control

система стане занадто жорсткою

⸻

2. Token cost

додаткові перевірки

⸻

3. Drift

LLM все одно може “обходити” план

⸻

🧭 Як ти будеш це використовувати

⸻

👉 Твій сценарій:
	1.	“ось 10 задач”
	2.	PM створює pipeline
	3.	система:
	•	знає що робити
	•	контролює як робити
	•	перевіряє результат

⸻

🧠 Після Sprint 8

⸻

👉 система переходить у стан:

Controlled Execution System

⸻
