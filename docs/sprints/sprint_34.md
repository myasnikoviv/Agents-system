🟪 Sprint 34 — Shared Semantic Memory & Declarative Meeting Loops

⸻

🧾 Meta
	•	Sprint ID: 34
	•	Name: Shared Semantic Memory & Declarative Meeting Loops
	•	Type: Core Platform (Cognitive Layer)
	•	Priority: 🔥 High
	•	Dependencies: Sprint 31 (IAM), Sprint 32 (Distributed Runtime), Sprint 33 (Cost Optimization)

⸻

🎯 Goal

Розширити систему до рівня:

❗ shared cognitive system, де:

	•	агенти працюють через спільну semantic memory
	•	складні рішення приймаються через declarative meeting loops
	•	логіка поведінки визначається конфігурацією, а не кодом

⸻

🧠 Core Principles

⸻

1. Multi-Tenant Isolation
	•	❗ Жодної памʼяті між tenant-ами
	•	❗ Жодного cross-user доступу

Tenant
 └── Workspace
      ├── Shared Memory   ← NEW
      ├── Project Memory
      ├── Task Memory
      └── Agent Memory


⸻

2. Declarative System First
	•	❗ Ніяких “зашитих” pipeline-ів
	•	❗ Вся поведінка задається через:
	•	YAML / MD
	•	agent files
	•	pipeline specs

⸻

3. Artifact-Based Truth
	•	❗ Система вірить не тексту, а артефактам
	•	❗ Валідація = перевірка артефактів

⸻

4. Meeting = Loop
	•	❗ Meeting НЕ є спеціальною логікою
	•	❗ Meeting = declarative loop з правилами

⸻

🧩 PART 1 — Shared Semantic Memory

⸻

🟫 EPIC 1 — Shared Memory Layer (Workspace Scoped)

⸻

🎫 AGSYS-3401 — Shared Memory Data Model

Description
Реалізувати graph-based memory в рамках workspace.

Structure

Entity {
  id: string
  type: "idea" | "decision" | "artifact" | "task" | "message"
  content: string
  metadata: {
    author: string
    timestamp: number
    workspace_id: string
  }
}

Relation {
  from: string
  to: string
  type: "depends_on" | "relates_to" | "contradicts" | "refines"
}

Acceptance Criteria
	•	graph структура
	•	versioning
	•	strict workspace scoping
	•	extensible schema

⸻

🎫 AGSYS-3402 — Memory Storage Engine

Description
Зберігання graph + embeddings.

Acceptance Criteria
	•	graph storage
	•	vector storage
	•	unified access layer
	•	no local-only memory

⸻

⸻

🟫 EPIC 2 — Semantic Retrieval

⸻

🎫 AGSYS-3403 — Relevance-Based Retrieval

Description
Пошук по сенсу, а не по scope.

Acceptance Criteria
	•	embedding search
	•	cross-scope (task/project/shared)
	•	relevance ranking
	•	deterministic API

⸻

🎫 AGSYS-3404 — Hybrid Retrieval

Description
Комбінація:
	•	semantic search
	•	graph traversal
	•	scope filters

Acceptance Criteria
	•	комбінований пошук
	•	configurable strategies
	•	explainable results

⸻

⸻

🟫 EPIC 3 — Memory Promotion

⸻

🎫 AGSYS-3405 — Promotion Engine

Description
Перенос важливої інформації в shared memory.

Logic
	•	decision → shared
	•	reusable pattern → shared
	•	critical insight → shared

Acceptance Criteria
	•	automatic promotion rules
	•	manual promotion
	•	deduplication
	•	audit trail

⸻

🎫 AGSYS-3406 — Promotion Rules Config

Description
Декларативні правила.

Acceptance Criteria
	•	YAML/MD rules
	•	configurable thresholds
	•	extensible

⸻

⸻

🟫 EPIC 4 — Memory Linking

⸻

🎫 AGSYS-3407 — Cross-Scope Links

Description
Звʼязки між памʼяттю.

Acceptance Criteria
	•	task ↔ shared
	•	project ↔ shared
	•	agent ↔ shared
	•	bidirectional

⸻

🎫 AGSYS-3408 — Relation Engine

Description
Створення звʼязків.

Acceptance Criteria
	•	explicit relations
	•	inferred relations
	•	conflict detection

⸻

⸻

🟫 EPIC 5 — Memory API

⸻

🎫 AGSYS-3409 — Unified Memory API

API
	•	getRelevantMemory(query)
	•	promoteMemory(entity)
	•	linkMemory(a, b)
	•	queryGraph()

Acceptance Criteria
	•	single entry point
	•	used by all agents
	•	no direct DB usage

⸻

⸻

🟫 EPIC 6 — Runtime Integration

⸻

🎫 AGSYS-3410 — Memory-Aware Execution

Acceptance Criteria
	•	agents отримують relevant memory
	•	pipelines використовують shared memory
	•	no blind execution

⸻

🎫 AGSYS-3411 — Context Injection

Acceptance Criteria
	•	automatic injection
	•	context size control
	•	prioritization

⸻

⸻

🧩 PART 2 — Declarative Meeting Loops

⸻

🟫 EPIC 7 — Declarative Meeting Spec

⸻

🎫 AGSYS-3412 — Meeting Spec Format

Description
Meeting описується декларативно.

Example

pipeline: meeting

mode: debate

participants:
  - architect
  - reviewer
  - devops

moderator: architect

rounds: 2

turn_strategy: round_robin

rules:
  - each_agent_must_provide_argument
  - reviewer_must_provide_risks
  - moderator_must_finalize_decision

artifacts:
  - decision
  - risks
  - solution

Acceptance Criteria
	•	YAML/MD формат
	•	підтримка кастомних правил
	•	user-defined behavior

⸻

⸻

🟫 EPIC 8 — Meeting Runtime Engine

⸻

🎫 AGSYS-3413 — Turn Engine

Acceptance Criteria
	•	strict turns
	•	no parallel execution
	•	deterministic order

⸻

🎫 AGSYS-3414 — Round Engine

Acceptance Criteria
	•	multi-round support
	•	state between rounds
	•	exit conditions

⸻

⸻

🟫 EPIC 9 — Artifact Validation

⸻

🎫 AGSYS-3415 — Artifact-Based Validation

Description
Контроль виконання через артефакти.

Acceptance Criteria
	•	required artifacts enforced
	•	missing artifacts блокують progression
	•	validation інтегрована з governance

⸻

⸻

🟫 EPIC 10 — Meeting as Loop

⸻

🎫 AGSYS-3416 — Loop Integration

Acceptance Criteria
	•	meeting = loop
	•	підтримує retry
	•	підтримує failure states
	•	інтегрується з loop engine

⸻

⸻

🟫 EPIC 11 — Moderator Behavior

⸻

🎫 AGSYS-3417 — Moderator Enforcement

Acceptance Criteria
	•	moderator формує питання
	•	контролює flow
	•	генерує decision artifact

⸻

⸻

🟫 EPIC 12 — Memory Integration

⸻

🎫 AGSYS-3418 — Meeting → Memory

Acceptance Criteria
	•	decision → shared memory
	•	discussion → graph nodes
	•	relations створюються

⸻

⸻

🟫 EPIC 13 — Minimal UI

⸻

🎫 AGSYS-3419 — Meeting UI

Acceptance Criteria
	•	chat-like view
	•	roles visible
	•	turns visible
	•	decision visible

⸻

🎫 AGSYS-3420 — Memory Insight UI

Acceptance Criteria
	•	related memory shown
	•	source links shown
	•	no complex graph UI

⸻

⸻

🧠 Definition of Done

⸻

Memory
	•	shared memory graph працює
	•	semantic retrieval працює
	•	promotion працює
	•	linking працює

⸻

Meeting
	•	declarative meeting spec працює
	•	strict turn execution
	•	artifact validation працює
	•	meeting інтегрований як loop

⸻

System
	•	isolation не порушена
	•	немає hardcoded logic
	•	система повністю декларативна

⸻

💥 Result

⸻

До:
	•	fragmented memory
	•	isolated agents
	•	implicit knowledge

⸻

Після:

❗ shared intelligence layer
❗ structured decision-making system
❗ knowledge accumulation across tasks

⸻

🔥 Critical Notes

⸻

❌ НЕ робити:
	•	fancy memory palace UI
	•	глобальну памʼять між users
	•	hardcoded meeting logic

⸻

✅ ОБОВʼЯЗКОВО:
	•	workspace isolation
	•	declarative control
	•	artifact validation
	•	loop integration

⸻
