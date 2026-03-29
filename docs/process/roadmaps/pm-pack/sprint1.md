Супер. Робимо Sprint 1 як production-grade spec, без простору для “домислювань”.
Нижче — Execution Spec, який можна віддати прямо в роботу.

⸻

🟦 SPRINT 1 — Runtime Stabilization & Observability Foundation

🎯 Ціль спринту

Зробити систему:
	•	детермінованою
	•	прозорою
	•	дебажною
	•	без зациклень
	•	без змішаних повідомлень
	•	з повною трасою виконання

⸻

🧩 EPIC 1 — Authoritative Runtime Timeline

⸻

🔧 Problem

Зараз:
	•	змішуються повідомлення (system + agent + debug)
	•	немає єдиного джерела істини
	•	UI показує не реальний процес, а “склеєний текст”

⸻

🎯 Goal

Ввести Event-Driven Runtime Model, де:

👉 ВСЕ = події
👉 Chat = тільки відображення частини подій

⸻

🧱 Data Model (ОБОВʼЯЗКОВО)

type RuntimeEvent = {
  id: string
  runId: string
  projectId: string
  chainId: string

  type:
    | 'run.started'
    | 'run.completed'
    | 'agent.started'
    | 'agent.completed'
    | 'agent.message'
    | 'system.thought'
    | 'swarm.handoff'
    | 'tool.call'
    | 'tool.result'
    | 'guard.triggered'
    | 'guard.retry'
    | 'llm.request'
    | 'llm.response'

  actor?: {
    type: 'agent' | 'system'
    id: string
    role?: string
  }

  payload: Record<string, any>

  timestamp: number
}


⸻

🧠 Backend Requirements

1. Event emission — ЄДИНЕ ДЖЕРЕЛО

Кожен крок runtime ПОВИНЕН емітити event:

❗ Заборонено:
	•	пушити текст напряму в чат
	•	формувати фінальну відповідь без event chain

⸻

2. Мінімальний набір events

Обовʼязково емітити:
	•	run.started
	•	agent.started
	•	system.thought (кожен reasoning step)
	•	llm.request
	•	llm.response
	•	agent.message (ФІНАЛЬНЕ повідомлення)
	•	swarm.handoff
	•	run.completed

⸻

3. Streaming
	•	events стрімляться через SSE / websocket
	•	UI отримує events у реальному часі

⸻

🖥 UI Requirements

1. Chat = filtered view

В чат потрапляє ТІЛЬКИ:

event.type === 'agent.message'


⸻

2. Debug Timeline (новий компонент)

Новий UI блок:

Runtime Timeline Panel

Показує:
	•	system.thought
	•	tool.call
	•	llm.request
	•	handoff
	•	guard.retry

⸻

3. Заборонено змішування

❌ НЕ МОЖНА:

Checking runtime...
Active role...
Ping passed...

✔️ Має бути:

Event 1:

system.thought: Checking runtime...

Event 2:

agent.message: (з header)


⸻

✅ Acceptance Criteria
	•	кожне повідомлення = 1 тип event
	•	немає змішаних повідомлень
	•	можна відтворити повний run через events
	•	UI показує live stream процесу

⸻

⸻

🧩 EPIC 2 — Prompt Tracing & Token Observability

⸻

🔧 Problem
	•	не видно prompt
	•	не видно токени
	•	неможливо дебажити

⸻

🎯 Goal

Повна прозорість LLM викликів

⸻

🧱 Data Model

type LLMTrace = {
  requestId: string
  runId: string

  model: string
  provider: 'codex-cli' | 'openhands' | 'claude-cli'

  prompt: string
  response: string

  tokensInput: number
  tokensOutput: number

  durationMs: number

  source:
    | 'agent'
    | 'guard'
    | 'retry'
    | 'system'

  timestamp: number
}


⸻

🔧 Backend Requirements

1. Обгортка ВСІХ LLM викликів

wrapLLMCall(fn)

логіку:
	•	записати prompt
	•	записати response
	•	порахувати tokens
	•	емітити event

⸻

2. Event integration

event.type = 'llm.request'
event.type = 'llm.response'


⸻

3. Storage
	•	Redis (short-term)
	•	або SQLite (long-term debug)

⸻

🖥 UI

Debug Panel

Показує:
	•	prompt
	•	response
	•	tokens
	•	source

⸻

✅ Acceptance
	•	можна відкрити run → побачити ВСІ prompts
	•	видно зайві виклики
	•	видно retries

⸻

⸻

🧩 EPIC 3 — Guard & Loop Control

⸻

🔧 Problem
	•	нескінченні retries
	•	витрата токенів
	•	зависання

⸻

🎯 Goal

Контрольований runtime

⸻

🔧 Rules

1. Retry limit

MAX_RETRIES_PER_GUARD = 2


⸻

2. Run limit

MAX_TOTAL_LLM_CALLS = 25


⸻

3. Timeout

MAX_RUN_TIME_MS = 60_000


⸻

4. Loop detection

Якщо:
	•	той самий prompt повторюється
	•	або той самий guard тригериться

→ STOP

⸻

🧱 Event

guard.triggered
guard.retry
run.failed


⸻

✅ Acceptance
	•	немає нескінченних циклів
	•	всі retry логуються
	•	система fail-fast

⸻

⸻

🧩 EPIC 4 — Context Isolation Fix

⸻

🔧 Problem
	•	відповідає на попереднє повідомлення
	•	змішаний контекст

⸻

🎯 Goal

Строга ізоляція

⸻

🧱 Context Model

type RunContext = {
  runId: string
  chainId: string
  projectId: string

  messages: Message[]
}


⸻

🔧 Rules

1. Новий user message → новий run

❗ Заборонено:
	•	використовувати старий runId

⸻

2. Context assembly

context = [
  system,
  project context,
  chain history (обмежено),
  current message
]


⸻

3. Заборонено carryover
	•	незавершений run НЕ впливає на новий

⸻

🔧 Fix Required
	•	ізоляція state по runId
	•	очищення pending state
	•	cancel previous run при новому input

⸻

✅ Acceptance
	•	нове повідомлення НЕ змішується зі старим
	•	немає “відповідь на попереднє питання”

⸻

⸻

🧪 TEST SUITE (ОБОВʼЯЗКОВО)

⸻

Test 1 — Clean Timeline

Input:

ping

Check:
	•	1 agent.message
	•	кілька system.thought
	•	немає змішаного тексту

⸻

Test 2 — Multi-step trace

Input:

зроби 3 кроки аналізу

Check:
	•	є system.thought ×3
	•	є llm.request ×3

⸻

Test 3 — Guard loop

Input:
(спеціальний кейс)

Check:
	•	max 2 retries
	•	stop event

⸻

Test 4 — Context isolation

Input:

1: A
2: B

Check:
	•	відповідь 2 НЕ містить A

⸻

Test 5 — Token explosion

Check:
	•	кожен llm call логується
	•	видно кількість

⸻

⸻

🚫 ЗАБОРОНИ
	•	не пушити текст у чат напряму
	•	не робити hidden logic
	•	не обʼєднувати events
	•	не пропускати llm tracing

⸻

🛑 STOP CONDITION (КРИТИЧНО)

Після Sprint 1:

✔ є timeline
✔ є prompt tracing
✔ немає loop runaway
✔ немає context leakage

❌ НЕ робимо:
	•	паралельність
	•	нові агенти
	•	workflow

⸻