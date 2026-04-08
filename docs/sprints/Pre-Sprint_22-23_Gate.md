🧠 System Capability Audit (Pre-Sprint 22/23 Gate)

⸻

🎯 Мета

Чітко зафіксувати:
	1.	Що реально існує
	2.	Де це реалізовано
	3.	Як це працює (фактично, а не задумано)
	4.	Який це тип логіки
	5.	Чи це стабільно / production-ready

⸻

📦 Що саме ти хочеш отримати (і це правильно)

Ти вже сформулював дуже сильну вимогу:

“не просто є/немає — а де, як, і на якому лейері”

Тобто вам потрібен не список, а структурована карта системи.

⸻

🧩 Формат, який вам потрібен (важливо)

Ось правильна структура документа, який має повернути агент:

⸻

📄 System Capability Audit Report

1. Capability Overview Table

Capability	Exists	Layer	Implementation Type	Source	Stable	Notes



⸻

2. Деталізація по кожній capability

Для КОЖНОЇ функції:

⸻

🔹 Capability: Self-Improvement Loop

Exists: ✅ / ⚠️ / ❌

Where implemented:
	•	файли
	•	сервіси
	•	runtime

Layer:
	•	LLM prompt layer
	•	LangGraph orchestration
	•	Governance Engine
	•	Backend logic
	•	Agent files
	•	External system

Implementation type:
	•	Declarative (YAML / agent files)
	•	Imperative (TS code)
	•	Hybrid
	•	Emergent (LLM behavior, не зафіксований)

Trigger:
	•	коли запускається

Flow:
	•	як саме працює

Artifacts:
	•	що створює (tickets, logs, memory, etc.)

Deterministic?
	•	так / ні

Issues:
	•	де ламається
	•	де нестабільно

⸻

🔍 ЩО САМЕ треба проаудитити (твій список, але структуровано)

⸻

🟫 CORE LOOPS

1. Self-Improvement Loop
	•	чи реально створює tasks?
	•	чи просто описаний?
	•	де живе (agent files vs runtime)

⸻

2. Auto Retry
	•	є retry?
	•	це:
	•	LLM retry?
	•	governance retry?
	•	queue retry?
	•	чи є retry policy?

⸻

3. Smart Routing

дуже важливий момент, ти правильно підмітив

	•	чи є реально routing agent?
	•	чи це просто prompt перед викликом?
	•	чи є deterministic routing?

⸻

4. Loop Enforcement
	•	чи перевіряється виконання loop?
	•	чи просто “LLM має зробити”?

⸻

🟩 WORKBENCH / TOOLS

5. Workbench
	•	чи існує runtime?
	•	чи просто контракт?
	•	чи є queue?
	•	чи є locking?

⸻

6. Tool Usage Tracking
	•	чи логиться?
	•	де?
	•	як використовується?

⸻

🟪 GOVERNANCE

7. Pre/Post Flight
	•	де реалізовано:
	•	YAML
	•	evaluator
	•	TS
	•	чи є hybrid (як ми говорили)

⸻

8. Declarative Rules Engine
	•	чи реально читається YAML?
	•	чи є fallback на код?

⸻

🟧 MEMORY

9. Memory Isolation
	•	per project?
	•	per agent?
	•	чи є leakage?

⸻

10. Agent Memory
	•	persistent?
	•	reset on new chat?
	•	shared?

⸻

🟥 MULTI-AGENT

11. Multiple Agents Mode
	•	реально distributed?
	•	чи imitation?

⸻

12. Worker Model
	•	чи існує?
	•	чи тільки концепт?

⸻

🟦 TELEMETRY

13. Token Tracking
	•	де?
	•	як?
	•	чи accurate?

⸻

14. Agent Usage Metrics
	•	чи є статистика?
	•	чи використовується?

⸻

🟨 ADVANCED (те що ти згадував)

15. Dynamic Skill Selection
	•	чи реально працює?
	•	чи LLM “на око” вибирає?

⸻

16. Adaptive Pipelines
	•	❌ скоріше за все нема
	•	але треба підтвердити

⸻

17. Self-Healing
	•	чи є:
	•	code fix?
	•	чи тільки tickets?

⸻

18. Agent Performance Scoring
	•	чи є scoring?
	•	чи просто лог?

⸻

🔥 Дуже важливий момент

Ти сказав ключову річ:

“LLM може або дотримуватися правил, або ні”

І саме цей аудит має відповісти:

👉 де у вас:
	•	LLM responsibility
👉 а де:
	•	deterministic enforcement

⸻

📊 Додатково (що обовʼязково вимагати)

1. Sequence Diagram (обовʼязково)

Хай покаже:

User → PM → Router → Agent → Tool → Governance → Memory → Next Agent


⸻

2. Layer Map

Хай класифікує:
	•	LLM Layer
	•	LangGraph Layer
	•	Runtime Layer
	•	Governance Layer
	•	UI Layer

⸻

3. Gap Table

Capability	Expected	Actual	Gap	Priority



⸻

🧠 Як це сформулювати агенту

Ось готовий промпт (прямо давай йому):

⸻

System Capability Audit Request

You must produce a COMPLETE system audit of the Agent System.

⚠️ IMPORTANT:
Do NOT describe intended behavior.
Describe ONLY what is ACTUALLY implemented.

⸻

Scope

Audit the following capabilities:
	•	Self-improvement loop
	•	Auto-retry
	•	Smart routing
	•	Loop enforcement
	•	Workbench / tools
	•	Governance (pre/post flight)
	•	Declarative rules engine
	•	Memory isolation (project / agent)
	•	Multiple agents mode
	•	Worker model
	•	Token tracking
	•	Agent usage telemetry
	•	Dynamic skill selection
	•	Adaptive pipelines
	•	Self-healing
	•	Agent performance scoring

⸻

For EACH capability provide:
	1.	Exists (YES / PARTIAL / NO)
	2.	Exact location in codebase (files / modules)
	3.	Layer:
	•	LLM
	•	LangGraph
	•	Runtime
	•	Governance
	•	Agent files
	4.	Implementation type:
	•	Declarative
	•	Imperative
	•	Hybrid
	•	Emergent (LLM-only)
	5.	Execution flow (step-by-step)
	6.	Deterministic or not
	7.	Artifacts produced
	8.	Known issues / instability

⸻

Required Outputs

1. Capability Table

Full matrix of all capabilities.

2. Deep Dive Sections

One section per capability.

3. System Flow Diagram

Full execution flow from user input to completion.

4. Layer Map

Show where logic actually lives.

5. Gap Analysis

Expected vs actual vs missing.

⸻

Critical Requirement

You MUST distinguish:
	•	logic enforced by code
vs
	•	logic assumed to be done by LLM

⸻

Output format

Markdown document (clean, structured, no fluff)

⸻

If something is unclear → explicitly mark as UNKNOWN::—
