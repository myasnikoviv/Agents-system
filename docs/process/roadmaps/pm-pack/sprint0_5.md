Супер. Оце якраз той крок, який відділяє “ми щось будуємо” від системи, яку неможливо зламати випадковими змінами.

Нижче — Sprint 0.5 як жорсткий formalization layer, який закриває всі прогалини.

⸻

🟫 SPRINT 0.5 — System Formalization & Guardrails

🎯 Мета

Зафіксувати систему так, щоб:
	•	не було двозначностей
	•	не було “магїї”
	•	будь-який дев/агент не міг зламати архітектуру
	•	всі наступні спринти спирались на чіткі контракти

⸻

📦 EPIC A — Runtime Architecture Formalization

⸻

🔧 Problem

Є розуміння, але немає формального артефакту, який:
	•	описує систему end-to-end
	•	використовується як reference

⸻

🧱 Task A1 — Runtime Architecture Diagram

Що зробити

Створити діаграму:

UI (Cockpit)
  ↓
API Layer
  ↓
Runtime Orchestrator
  ↓
Execution Router
  ↓
LangGraph / Execution Engine
  ↓
Agents
  ↓
LLM Provider (Codex / OpenHands)
  ↓
Event Bus (Redis)
  ↓
Storage (SQLite / Redis)


⸻

🧱 Task A2 — Sequence Diagram (КРИТИЧНО)

Flow:

User → UI
→ API
→ Runtime
→ Agent
→ LLM
→ Response
→ Events
→ UI


⸻

🧱 Task A3 — Responsibility Map

Компонент	Відповідальність
LangGraph	orchestration
Redis	events + memory
Agent	reasoning
Provider	execution
Cockpit	visualization


⸻

✅ Acceptance
	•	є diagram (png / md / mermaid)
	•	є sequence flow
	•	є responsibility table

⸻

⸻

📦 EPIC B — Event → UI Contract

⸻

🔧 Problem

Є events і UI, але немає строгого mapping

⸻

🎯 Goal

👉 UI = deterministic projection of events

⸻

🧱 Task B1 — Event Contract

event.type → UI.component


⸻

🧱 Task B2 — Mapping Table

Event	UI
agent.message	chat
system.thought	timeline
tool.call	tool block
swarm.handoff	badge


⸻

🧱 Task B3 — Rendering Rules
	•	НЕ змішувати events
	•	1 event = 1 UI блок

⸻

🧱 Task B4 — Streaming Rules
	•	порядок = timestamp
	•	не reorder

⸻

✅ Acceptance
	•	будь-який event відображається однозначно
	•	немає “змішаних повідомлень”

⸻

⸻

📦 EPIC C — Artifact Registry

⸻

🔧 Problem

Артефакти є, але вони розкидані

⸻

🎯 Goal

👉 централізований registry

⸻

🧱 Task C1 — Define Structure

/docs/runtime/
  architecture.md
  sequence.md
  memory.md

/docs/tests/
  execution_modes.md
  isolation.md

/docs/debug/
  prompt_traces.md


⸻

🧱 Task C2 — Registry Index

Artifacts = {
  architecture,
  tests,
  audits,
  traces
}


⸻

🧱 Task C3 — Versioning
	•	version
	•	last updated

⸻

✅ Acceptance
	•	всі артефакти в одному місці
	•	є індекс

⸻

⸻

📦 EPIC D — Global Definition of Done (System-Level)

⸻

🔧 Problem

Є DoD для задач, але НЕ для системи

⸻

🎯 Goal

👉 зрозуміти, коли система “здорова”

⸻

🧱 Task D1 — Define DoD

SystemDoD = {
  no_context_leak: true,
  no_infinite_loops: true,
  deterministic_execution: true,
  traceable_prompts: true,
  reproducible_runs: true
}


⸻

🧱 Task D2 — Validation Checklist
	•	run reproducible
	•	events complete
	•	no duplicate calls
	•	no stuck runs

⸻

🧱 Task D3 — CI Hook (опціонально)
	•	автоматична перевірка

⸻

✅ Acceptance
	•	є документ
	•	можна перевірити систему

⸻

⸻

📦 EPIC E — Runtime Cost Guardrails

⸻

🔧 Problem

Є observability, але немає контролю

⸻

🎯 Goal

👉 система НЕ може “спалити бюджет”

⸻

🧱 Task E1 — Budget Limits

MAX_TOKENS_PER_RUN = 50_000
MAX_LLM_CALLS = 25


⸻

🧱 Task E2 — Cost Tracking

run.cost = tokens * price


⸻

🧱 Task E3 — Abort Rules

if cost > limit → abort


⸻

🧱 Task E4 — Warning System
	•	UI warning
	•	logs

⸻

✅ Acceptance
	•	run не може вийти за бюджет
	•	видно cost

⸻

⸻

📦 EPIC F — Test Coverage Contract

⸻

🔧 Problem

Є тести, але немає гарантії покриття

⸻

🎯 Goal

👉 кожен критичний аспект має тест

⸻

🧱 Task F1 — Coverage Matrix

Area	Test
modes	✔
memory	✔
isolation	✔
loops	✔


⸻

🧱 Task F2 — Mandatory Tests
	•	multi-message
	•	parallel
	•	handoff
	•	isolation

⸻

🧱 Task F3 — Regression Rule

❗ жодна зміна без тесту

⸻

✅ Acceptance
	•	покриття повне
	•	немає “сліпих зон”

⸻

⸻

📦 EPIC G — Execution Contract (Anti-Hallucination Layer)

⸻

🔧 Problem

Агенти можуть “вигадувати”

⸻

🎯 Goal

👉 змусити систему працювати тільки по контрактах

⸻

🧱 Task G1 — Strict Contracts
	•	input schema
	•	output schema

⸻

🧱 Task G2 — Validation Layer

validate(response)


⸻

🧱 Task G3 — Reject Invalid Output
	•	не приймати free text
	•	тільки структуроване

⸻

🧱 Task G4 — Fallback Strategy
	•	retry
	•	або fail

⸻

✅ Acceptance
	•	немає “галюцинацій формату”
	•	відповіді валідні

⸻

⸻

🛑 STOP CONDITION

Після Sprint 0.5:

✔ є architecture map
✔ є event contract
✔ є artifact registry
✔ є system DoD
✔ є cost control
✔ є test coverage
✔ є strict contracts

⸻

🧠 ЧОМУ ЦЕ КРИТИЧНО

👉 Без цього:
	•	Sprint 1–5 = нестабільні
	•	баги = “містичні”
	•	система = неконтрольована

⸻

👉 З цим:
	•	система = deterministic
	•	ти = контролюєш все
	•	будь-який баг = відтворюється

⸻
