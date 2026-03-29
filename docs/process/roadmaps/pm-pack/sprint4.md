🔥 Оце найцікавіший спринт — тут ти переходиш від “інструмента” до системи, яка реально працює замість тебе.

⸻

🟪 SPRINT 4 — PM Workflow & Autonomous Execution (Ralf Vig Mode)

🎯 Мета

Реалізувати сценарій:

👉 ти даєш пакет задач →
👉 система їх структурує →
👉 ти підтверджуєш →
👉 система автономно виконує →
👉 система сама перевіряє якість

⸻

⚠️ Ключовий принцип

👉 НЕ вшивати логіку в агентів
👉 Робити надбудову (orchestration layer)

⸻

📦 Структура спринту (PM Ready)

⸻

🧩 EPIC 12 — Task Package Workflow

⸻

🔧 Problem

Зараз:
	•	немає структури задач
	•	немає selection
	•	немає control layer

⸻

🎯 Goal

Ввести сутність:

TaskPackage


⸻

🧱 Task 12.1 — Define TaskPackage Model

type TaskPackage = {
  id: string
  projectId: string

  epics: Epic[]
  stories: Story[]
  tasks: Task[]

  selectedItems: string[]

  status: 'draft' | 'confirmed' | 'executing' | 'completed'
}


⸻

🧱 Task 12.2 — PM Output Contract

PM має відповідати СТРУКТУРОВАНО:

{
  "epics": [...],
  "stories": [...],
  "tasks": [...]
}


⸻

❗ Заборонено
	•	free text без структури

⸻

🧱 Task 12.3 — Selection Layer (Checkbox Logic)

Що зробити
	•	всі items → selected = true (default)
	•	user може:
	•	зняти галочки
	•	вибрати subset

⸻

🧱 Task 12.4 — Confirmation Step

Flow:

PM → пропонує
User → підтверджує
System → фіксує selectedItems


⸻

✅ Acceptance
	•	можна:
	•	створити пакет
	•	вибрати частину
	•	підтвердити

⸻

⸻

🧩 EPIC 13 — Execution Context Binding

⸻

🔧 Problem

Система зараз не “тримає” задачі як контекст

⸻

🎯 Goal

👉 Execution = працює тільки з selected tasks

⸻

🧱 Task 13.1 — Bind Context

ExecutionContext = {
  taskPackageId
  selectedTasks[]
}


⸻

🧱 Task 13.2 — Inject into Agents

В кожен prompt:

context.tasks = selectedTasks


⸻

🧱 Task 13.3 — Task Progress Tracking

Task.status:
  | pending
  | in_progress
  | done


⸻

🧱 Task 13.4 — Plane Sync
	•	створення задач
	•	оновлення статусів
	•	читання стану

⸻

✅ Acceptance
	•	система працює тільки з вибраними задачами
	•	статуси синхронізуються

⸻

⸻

🧩 EPIC 14 — Task Completion Verification Loop

⸻

🔧 Problem

“done” ≠ реально done

⸻

🎯 Goal

👉 автоматична перевірка задач

⸻

🧱 Task 14.1 — Verification Contract

type VerificationResult = {
  success: boolean
  issues: string[]
}


⸻

🧱 Task 14.2 — Trigger

onTaskDone → runVerification()


⸻

🧱 Task 14.3 — Validation Rules

Перевірити:
	•	чи є handoff
	•	чи є коментар
	•	чи є output
	•	чи pipeline виконаний

⸻

🧱 Task 14.4 — Retry Loop

if (!success):
  send back to agent


⸻

🧱 Task 14.5 — Max Retry

MAX_VERIFY_RETRIES = 2


⸻

✅ Acceptance
	•	задача не закривається без перевірки
	•	є structured результат

⸻

⸻

🧩 EPIC 15 — Verification Wrapper (Decoupled)

⸻

🔧 Problem

Не можна вшивати в agent files

⸻

🎯 Goal

👉 універсальний verification layer

⸻

🧱 Task 15.1 — Wrapper Prompt

Verify:
- task correctness
- pipeline compliance
Return JSON


⸻

🧱 Task 15.2 — Agent Selection

verifier = selectAgent(role)


⸻

🧱 Task 15.3 — Structured Output Enforcement

❗ тільки JSON

⸻

🧱 Task 15.4 — Pipeline Injection
	•	передати:
	•	skills
	•	pipeline rules

⸻

✅ Acceptance
	•	verification НЕ залежить від agent files
	•	легко змінюється

⸻

⸻

🧩 EPIC 16 — Autonomous Execution Loop

⸻

🔧 Problem

Система не працює “сама”

⸻

🎯 Goal

👉 повний loop:

tasks → execute → verify → next → done


⸻

🧱 Task 16.1 — Loop Engine

while (tasks.notDone()):
  executeTask()
  verify()


⸻

🧱 Task 16.2 — Queue

taskQueue = selectedTasks


⸻

🧱 Task 16.3 — State Machine

idle → running → verifying → completed


⸻

🧱 Task 16.4 — Failure Handling

if failed:
  retry
  or escalate


⸻

🧱 Task 16.5 — Overnight Mode
	•	long-running execution
	•	без user input

⸻

✅ Acceptance
	•	можна:
	•	запустити пакет
	•	піти
	•	повернутись → все виконано

⸻

⸻

🧪 TEST SUITE (SPRINT 4)

⸻

Test 14 — Task package

✔ створено
✔ обрано subset

⸻

Test 15 — Execution

✔ система працює по списку

⸻

Test 16 — Verification

✔ неправильна задача → retry

⸻

Test 17 — Full loop

✔ tasks → done

⸻

Test 18 — Overnight

✔ працює без user

⸻

⸻

🛑 STOP CONDITION

Після Sprint 4:

✔ є Task Package
✔ є selection
✔ є execution loop
✔ є verification

❌ НЕ робимо:
	•	UX поліш
	•	UI деталізацію
	•	performance tuning

⸻

⚠️ Найважливіше

👉 Це ядро твоєї системи

Якщо зробити правильно:
	•	ти реально отримуєш “агент працює за тебе”

Якщо ні:
	•	буде хаос

⸻
