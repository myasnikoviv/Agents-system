

Я зробив:
	•	чіткі Sprint → Epic → Tasks
	•	acceptance criteria без “води”
	•	stop rules
	•	мінімум місця для галюцинацій

⸻

🟫 SPRINT 0.5 — System Formalization & Guardrails

🧩 EPIC: Architecture & Contracts

🧾 TASK S0.5-1 — Runtime Architecture Diagram

Description:
Створити end-to-end діаграму системи (UI → Runtime → Agents → LLM → Events → Storage)

Acceptance:
	•	є diagram (mermaid або png)
	•	покриває всі компоненти
	•	використовується як reference

⸻

🧾 TASK S0.5-2 — Sequence Flow Diagram

Description:
Описати повний lifecycle одного run

Acceptance:
	•	є sequence diagram
	•	видно: input → agent → LLM → events → UI

⸻

🧾 TASK S0.5-3 — Responsibility Map

Acceptance:
	•	таблиця компонентів і відповідальностей
	•	немає “сірих зон”

⸻

⸻

🧩 EPIC: Event → UI Contract

🧾 TASK S0.5-4 — Event Mapping Spec

Acceptance:
	•	кожен event має UI mapping
	•	1 event = 1 UI блок

⸻

🧾 TASK S0.5-5 — Rendering Rules

Acceptance:
	•	немає змішаних повідомлень
	•	порядок = timestamp

⸻

⸻

🧩 EPIC: Artifact Registry

🧾 TASK S0.5-6 — Artifact Structure

Acceptance:
	•	створена структура /docs
	•	всі артефакти централізовані

⸻

🧾 TASK S0.5-7 — Artifact Index

Acceptance:
	•	є index файл
	•	всі артефакти перелічені

⸻

⸻

🧩 EPIC: System DoD

🧾 TASK S0.5-8 — Define System DoD

Acceptance:
	•	описано критерії стабільності системи
	•	включає loops, memory, prompts

⸻

⸻

🧩 EPIC: Cost Guardrails

🧾 TASK S0.5-9 — Token Budget Limits

Acceptance:
	•	max tokens / run
	•	max llm calls

⸻

🧾 TASK S0.5-10 — Abort Rules

Acceptance:
	•	run завершується при перевищенні

⸻

⸻

🧩 EPIC: Execution Contracts

🧾 TASK S0.5-11 — Input/Output Schema

Acceptance:
	•	всі відповіді валідні
	•	JSON enforced

⸻

⸻

🟦 SPRINT 1 — Runtime Stabilization

🧩 EPIC: Runtime Timeline

🧾 TASK S1-1 — Event Model Implementation

Acceptance:
	•	всі кроки = events
	•	немає direct chat writes

⸻

🧾 TASK S1-2 — Event Streaming (SSE/WebSocket)

Acceptance:
	•	UI отримує live events

⸻

🧾 TASK S1-3 — Chat Filtering Layer

Acceptance:
	•	chat показує тільки agent.message

⸻

⸻

🧩 EPIC: Prompt Tracing

🧾 TASK S1-4 — LLM Wrapper

Acceptance:
	•	всі виклики логуються

⸻

🧾 TASK S1-5 — Token Tracking

Acceptance:
	•	видно tokens per call

⸻

⸻

🧩 EPIC: Loop Control

🧾 TASK S1-6 — Retry Limits

Acceptance:
	•	max 2 retries

⸻

🧾 TASK S1-7 — Loop Detection

Acceptance:
	•	duplicate prompt → stop

⸻

⸻

🧩 EPIC: Context Isolation

🧾 TASK S1-8 — Run Isolation

Acceptance:
	•	новий run не залежить від старого

⸻

🧾 TASK S1-9 — Run Cancellation

Acceptance:
	•	новий input → cancel previous

⸻

⸻

🟩 SPRINT 2 — Execution Validation

🧩 EPIC: Execution Modes

🧾 TASK S2-1 — Mode Spec + Truth Table

Acceptance:
	•	таблиця режимів

⸻

🧾 TASK S2-2 — Mode Tests

Acceptance:
	•	підтверджено через events

⸻

⸻

🧩 EPIC: Handoff

🧾 TASK S2-3 — Handoff Detection

Acceptance:
	•	є swarm.handoff event

⸻

🧾 TASK S2-4 — Handoff Tests

Acceptance:
	•	мінімум 2 агенти

⸻

⸻

🧩 EPIC: Parallelism

🧾 TASK S2-5 — Parallel Execution Test

Acceptance:
	•	або підтверджено
	•	або задокументовано що нема

⸻

⸻

🧩 EPIC: Multi-message Stability

🧾 TASK S2-6 — Multi-step Tests (2–5 messages)

Acceptance:
	•	немає leakage

⸻

⸻

🧩 EPIC: Provider Validation

🧾 TASK S2-7 — Provider Consistency Test

Acceptance:
	•	Codex vs OpenHands однакові патерни

⸻

⸻

🟨 SPRINT 3 — Memory & Agent Hardening

🧩 EPIC: Memory

🧾 TASK S3-1 — Memory Contract

Acceptance:
	•	project / chain / run / agent визначені

⸻

🧾 TASK S3-2 — Namespace Enforcement

Acceptance:
	•	всі ключі з projectId

⸻

⸻

🧩 EPIC: Agent Identity

🧾 TASK S3-3 — Agent Identity Key

Acceptance:
	•	один агент = один id

⸻

🧾 TASK S3-4 — Agent Lifecycle

Acceptance:
	•	агент не створюється кожен раз

⸻

⸻

🧩 EPIC: Isolation

🧾 TASK S3-5 — Cross-project Isolation Test

Acceptance:
	•	немає leakage

⸻

⸻

🧩 EPIC: Context Assembly

🧾 TASK S3-6 — Context Pipeline

Acceptance:
	•	deterministic порядок

⸻

⸻

🧩 EPIC: Recovery

🧾 TASK S3-7 — Run Recovery

Acceptance:
	•	немає stuck state

⸻

⸻

🟪 SPRINT 4 — Autonomous System (Ralf Vig)

🧩 EPIC: Task Packages

🧾 TASK S4-1 — TaskPackage Model

Acceptance:
	•	epics / tasks / selection

⸻

🧾 TASK S4-2 — PM Structured Output

Acceptance:
	•	JSON формат

⸻

🧾 TASK S4-3 — Selection Logic

Acceptance:
	•	checkbox selection

⸻

⸻

🧩 EPIC: Execution Context

🧾 TASK S4-4 — Context Binding

Acceptance:
	•	тільки selected tasks

⸻

🧾 TASK S4-5 — Plane Sync

Acceptance:
	•	статуси синхронізуються

⸻

⸻

🧩 EPIC: Verification Loop

🧾 TASK S4-6 — Verification Contract

Acceptance:
	•	structured result

⸻

🧾 TASK S4-7 — Retry Logic

Acceptance:
	•	max 2 retries

⸻

⸻

🧩 EPIC: Wrapper

🧾 TASK S4-8 — Verification Wrapper

Acceptance:
	•	незалежний від agent files

⸻

⸻

🧩 EPIC: Execution Engine

🧾 TASK S4-9 — Loop Engine

Acceptance:
	•	tasks → execute → verify

⸻

⸻

🟥 SPRINT 5 — UX & Operator Mode

🧩 EPIC: Live Stream

🧾 TASK S5-1 — Event Stream Renderer

Acceptance:
	•	видно live процес

⸻

🧾 TASK S5-2 — Message Types UI

Acceptance:
	•	різні типи подій

⸻

⸻

🧩 EPIC: Clickable Artifacts

🧾 TASK S5-3 — Artifact Parser

Acceptance:
	•	файли клікабельні

⸻

🧾 TASK S5-4 — Click Actions

Acceptance:
	•	відкриває файл / тікет

⸻

⸻

🧩 EPIC: Control Panel

🧾 TASK S5-5 — Agent Panel

Acceptance:
	•	видно активних агентів

⸻

🧾 TASK S5-6 — Process Tracker

Acceptance:
	•	видно runs

⸻

⸻

🧩 EPIC: Navigation

🧾 TASK S5-7 — Project/Chain Structure

Acceptance:
	•	project → chains → messages

⸻

⸻

🧩 EPIC: Debug Mode

🧾 TASK S5-8 — Prompt Viewer

Acceptance:
	•	видно prompt

⸻

🧾 TASK S5-9 — Event Inspector

Acceptance:
	•	raw events доступні

⸻

⸻
