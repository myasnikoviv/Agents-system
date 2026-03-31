Супер, тепер у нас уже є база (audit + MVP enforcement), і можна робити Sprint 6 як повноцінний системний шар, а не “ще один if у коді”.

Я зроблю тобі чітке технічне завдання рівня system design + implementation, щоб:
	•	не було двозначностей
	•	можна було розбити в Plane
	•	не було галюцинацій при реалізації

⸻

🟫 SPRINT 6 — Governance Engine (Runtime Policy Enforcement Layer)

⸻

🎯 Мета

Побудувати Governance Engine, який:
	•	виконує runtime enforcement правил незалежно від LLM
	•	зв’язує:
	•	agent definitions
	•	runtime execution
	•	project artifacts
	•	працює через:
	•	events
	•	artifacts
	•	telemetry
	•	підтримує:
	•	hard gates
	•	soft gates
	•	verification loops
	•	мінімізує використання LLM (deterministic first)

⸻

🧠 Ключовий принцип

Execution ≠ Success.
Success = Proven Compliance (через evidence).

⸻

🧩 Архітектура (Target)

User → Runtime → Execution Engine
                ↓
          Governance Engine
                ↓
      Evidence (events / artifacts / telemetry)
                ↓
      Enforcement (block / retry / allow)


⸻

📦 CORE КОМПОНЕНТИ

⸻

1. Governance Engine Core

Відповідальність
	•	запуск правил
	•	збір evidence
	•	прийняття рішення
	•	запуск remediation

⸻

2. Rule Registry
	•	список governance rules
	•	metadata правил

⸻

3. Evidence Collector
	•	збір:
	•	events
	•	artifacts
	•	telemetry

⸻

4. Evaluation Engine
	•	deterministic checks
	•	LLM verification (fallback)

⸻

5. Enforcement Engine
	•	block
	•	retry
	•	allow
	•	escalate

⸻

6. Policy Binding Layer
	•	прив’язка правил до:
	•	project
	•	session
	•	task

⸻

7. Governance Ledger
	•	лог всіх перевірок
	•	audit trail

⸻

🧱 DOMAIN MODEL

⸻

GovernanceRule

type GovernanceRule = {
  id: string
  name: string

  trigger: TriggerPhase

  evidence: EvidenceSpec[]

  evaluation: EvaluationType

  enforcement: EnforcementType

  remediation?: RemediationStrategy
}


⸻

TriggerPhase

type TriggerPhase =
  | 'session_start'
  | 'task_created'
  | 'before_execution'
  | 'after_execution'
  | 'before_task_close'
  | 'after_task_close'


⸻

EvidenceSpec

type EvidenceSpec = {
  type:
    | 'artifact'
    | 'event'
    | 'telemetry'

  source: string
  required: boolean
}


⸻

EvaluationType

type EvaluationType =
  | 'deterministic'
  | 'llm'
  | 'hybrid'


⸻

EnforcementType

type EnforcementType =
  | 'hard_gate'
  | 'soft_gate'
  | 'advisory'


⸻

RemediationStrategy

type RemediationStrategy =
  | 'retry_step'
  | 'invoke_agent'
  | 'ask_for_justification'
  | 'create_artifact'


⸻

PolicyBinding

type PolicyBinding = {
  projectId: string
  enabledRules: string[]
}


⸻

⚙️ EXECUTION FLOW

⸻

1. Trigger

Runtime emits phase → Governance Engine invoked


⸻

2. Evidence Collection

collect:
- events
- artifacts
- telemetry


⸻

3. Evaluation

deterministic → first
if uncertain → LLM fallback


⸻

4. Enforcement

hard_gate → block
soft_gate → retry
advisory → log


⸻

5. Logging

write to governance ledger


⸻

📦 MVP RULE SET (вбудований)

Sprint 6 повинен включати мінімум:
	1.	Git Preflight
	2.	Postflight
	3.	Improvement Loop
	4.	Agent Usage
	5.	Pipeline Usage
	6.	Cost Tracking

(те, що ти вже визначив)

⸻

📦 EPICS

⸻

🧩 EPIC 1 — Governance Core

Завдання
	•	створити GovernanceEngine
	•	lifecycle hook integration

Acceptance
	•	engine викликається на всіх trigger фазах

⸻

🧩 EPIC 2 — Rule Registry

Завдання
	•	registry правил
	•	static config (MVP)

Acceptance
	•	rules доступні runtime

⸻

🧩 EPIC 3 — Evidence Layer

Завдання
	•	event collector
	•	artifact checker
	•	telemetry reader

Acceptance
	•	evidence доступний rule evaluator

⸻

🧩 EPIC 4 — Evaluation Engine

Завдання
	•	deterministic evaluator
	•	LLM verifier wrapper

Acceptance
	•	правила оцінюються стабільно

⸻

🧩 EPIC 5 — Enforcement Engine

Завдання
	•	block
	•	retry
	•	allow

Acceptance
	•	runtime реально змінює поведінку

⸻

🧩 EPIC 6 — Governance Ledger

Завдання
	•	лог перевірок

Acceptance
	•	audit trail доступний

⸻

🧩 EPIC 7 — Policy Binding

Завдання
	•	project-level binding

Acceptance
	•	правила вмикаються/вимикаються

⸻

📊 ACCEPTANCE CRITERIA (GLOBAL)

Система вважається готовою якщо:

⸻

✔ Hard guarantees
	•	не можна стартувати без preflight
	•	не можна закрити без artifacts

⸻

✔ Soft enforcement
	•	missing pipeline → retry
	•	missing agents → warning + retry

⸻

✔ Observability
	•	кожна перевірка логується
	•	видно evidence

⸻

✔ Determinism
	•	перевірки не залежать від LLM

⸻

✔ Decoupling
	•	governance layer не залежить від agent files

⸻

⚠️ ОБМЕЖЕННЯ

⸻

❌ НЕ ВХОДИТЬ
	•	UI governance panel
	•	dynamic rule editor
	•	advanced workbench enforcement
	•	ML-based optimization

⸻

🧠 РИЗИКИ

⸻

1. Overhead
	•	занадто багато перевірок → latency

2. False negatives
	•	неправильно визначений evidence

3. Over-coupling
	•	якщо почати читати agent files напряму

⸻

🚀 РЕЗУЛЬТАТ ПІСЛЯ СПРИНТА

Після Sprint 6:

👉 система переходить від:
	•	“LLM виконує як хоче”

до:
	•	runtime enforced system

⸻
