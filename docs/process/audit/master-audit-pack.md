⸻

🟫 ✅ MASTER AUDIT PACK (Sprint 0.5 → 5)

⸻

📩 PROMPT ДЛЯ АГЕНТА

You must produce a COMPLETE Sprint Audit Report.

Scope:
Sprint 0.5 → Sprint 5

Goal:
Verify that all acceptance criteria are actually implemented and working.

CRITICAL RULES:
- No assumptions
- No "should be working"
- Only verified facts
- Every claim must include evidence

Output format: Markdown

Structure:
For each task:

- Status: DONE / PARTIAL / NOT DONE
- Evidence:
  - file paths
  - code references
  - logs or outputs
- Test:
  - how it was verified
- Gaps:
  - what is missing

At the end:
- Summary per sprint
- Global risk list
- Blockers for next sprint

If something is not verifiable → mark as NOT DONE


⸻

🧠 ДАЛІ — ЧЕКЛІСТ (ядро)

⸻

🟫 SPRINT 0.5 — System Formalization

🔍 Архітектура
	•	Чи існує end-to-end diagram (UI → runtime → agents → LLM → storage)?
	•	Чи є sequence diagram run lifecycle?
	•	Чи є responsibility map без сірих зон?

⸻

🔍 Event → UI
	•	Чи є mapping: event → UI representation?
	•	Чи виконується правило:
	•	1 event = 1 UI блок?
	•	Чи немає змішаних повідомлень?

⸻

🔍 Artifacts
	•	Чи існує centralized /docs структура?
	•	Чи є artifact index?

⸻

🔍 DoD
	•	Чи описаний system DoD?
	•	Чи включає:
	•	loops
	•	memory
	•	prompts?

⸻

🔍 Guardrails
	•	Чи є:
	•	max tokens
	•	max LLM calls?
	•	Чи реально вони enforce-яться?

⸻

🔍 Contracts
	•	Чи всі outputs валідні JSON?
	•	Чи є schema enforcement?

⸻

🟦 SPRINT 1 — Runtime Stabilization

🔍 Event Model
	•	Чи ВСЕ в runtime — це events?
	•	Чи є:
	•	run.started
	•	agent.started
	•	system.thought
	•	llm.request/response
	•	agent.message
	•	run.completed?

⸻

🔍 Streaming
	•	Чи працює SSE/WebSocket?
	•	Чи UI отримує live events?

⸻

🔍 Chat Layer
	•	Чи chat показує тільки agent.message?
	•	Чи немає:
	•	system.thought
	•	debug у чаті?

⸻

🔍 LLM Wrapper
	•	Чи ВСІ LLM виклики проходять через wrapper?
	•	Чи логуються:
	•	prompt
	•	response
	•	tokens
	•	duration?

⸻

🔍 Token Tracking
	•	Чи видно tokens per call?
	•	Чи видно total per run?

⸻

🔍 Loop Control
	•	Чи є retry limit (max 2)?
	•	Чи loop detection працює?
	•	Чи система stop-иться?

⸻

🔍 Run Isolation
	•	Чи новий run має новий runId?
	•	Чи нема leakage між runs?

⸻

🔍 Run Cancellation
	•	Чи новий input cancel-ить попередній run?

⸻

🟩 SPRINT 2 — Execution Validation

🔍 Modes
	•	Чи є truth table для режимів?
	•	Чи реально реалізовані:
	•	quasi-linear
	•	multiple agents?

⸻

🔍 Handoff
	•	Чи є swarm.handoff event?
	•	Чи реально 2+ агенти беруть участь?

⸻

🔍 Parallelism
	•	Чи реально є паралельне виконання?
	•	Якщо ні — чи задокументовано?

⸻

🔍 Multi-step
	•	Чи стабільно працюють 2–5 повідомлень?
	•	Чи нема context drift?

⸻

🔍 Providers
	•	Чи однаковий патерн для:
	•	Codex
	•	OpenHands?

⸻

🟨 SPRINT 3 — Memory & Agent Hardening

🔍 Memory Model
	•	Чи визначені:
	•	project
	•	chain
	•	run
	•	agent memory?

⸻

🔍 Namespace
	•	Чи всі ключі мають projectId?
	•	Чи нема cross-project leakage?

⸻

🔍 Agent Identity
	•	Чи агент має стабільний id?
	•	Чи не створюється кожен раз новий?

⸻

🔍 Lifecycle
	•	Чи є lifecycle агента?
	•	Чи є reuse?

⸻

🔍 Isolation
	•	Чи протестовано cross-project isolation?

⸻

🔍 Context Assembly
	•	Чи deterministic порядок context?
	•	Чи немає випадковості?

⸻

🔍 Recovery
	•	Чи система не зависає?
	•	Чи є recovery механізм?

⸻

🟪 SPRINT 4 — Autonomous Execution (Ralf Vig)

🔍 Task Package
	•	Чи існує модель:
	•	epics
	•	tasks
	•	selection?

⸻

🔍 PM Output
	•	Чи PM повертає JSON?
	•	Чи структура стабільна?

⸻

🔍 Selection
	•	Чи checkbox selection працює?
	•	Чи можна вибрати subset?

⸻

🔍 Context Binding
	•	Чи тільки selected tasks йдуть у контекст?

⸻

🔍 Plane Sync
	•	Чи статуси синхронізуються?

⸻

🔍 Verification
	•	Чи є structured verification output?
	•	Чи deterministic?

⸻

🔍 Retry
	•	Чи max 2 retries?

⸻

🔍 Wrapper
	•	Чи verification незалежний від agent files?

⸻

🔍 Loop Engine
	•	Чи працює:
	•	execute → verify → retry?

⸻

🟥 SPRINT 5 — UX & Operator Mode

🔍 Live Stream
	•	Чи видно live процес?
	•	Чи видно:
	•	thought
	•	tool calls
	•	handoff?

⸻

🔍 Message Types
	•	Чи UI розділяє типи подій?

⸻

🔍 Artifacts
	•	Чи файли клікабельні?
	•	Чи відкриваються?

⸻

🔍 Control Panel
	•	Чи видно активних агентів?
	•	Чи видно статуси?

⸻

🔍 Navigation
	•	Чи є:
	•	project → chains → messages?

⸻

🔍 Debug Mode
	•	Чи можна подивитись prompt?
	•	Чи можна подивитись raw events?

⸻

🧠 ФІНАЛЬНИЙ БЛОК (обов’язковий)

Агент має відповісти:

## Sprint Status Summary

Sprint 0.5: %
Sprint 1: %
Sprint 2: %
Sprint 3: %
Sprint 4: %
Sprint 5: %

## Critical Gaps
- ...

## Blockers for Sprint 6
- ...

## Risk Assessment
- ...


⸻
