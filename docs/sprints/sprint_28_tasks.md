🟪 Sprint 28 — Epics

EPIC 1 — Architecture Workspace & Repo Structure

EPIC 2 — C4 Model (Structurizr DSL)

EPIC 3 — arc42 Documentation Layer

EPIC 4 — ADR (Architecture Decision Records) System

EPIC 5 — Linking Layer (Code ↔ Architecture ↔ Decisions)

EPIC 6 — Agent Context Layer

EPIC 7 — Export / Visualization

EPIC 8 — Governance & Workflow Integration

EPIC 9 — Validation & Consistency Checks

⸻

🟫 EPIC 1 — Architecture Workspace & Repo Structure

⸻

🎫 AGSYS-2801 — Architecture Repository Structure

Description
Створити структуру для Architecture Knowledge Base (AKB).

Acceptance Criteria
	•	є окрема директорія (/architecture або окремий repo)
	•	структура включає:
	•	/dsl
	•	/docs
	•	/adr
	•	/exports
	•	структура задокументована
	•	version-controlled

Handoff
PM → Solution Architect → Developer → Documentation Owner → PM

⸻

🎫 AGSYS-2802 — Docs-as-Code Conventions

Description
Визначити правила ведення архітектурної документації.

Acceptance Criteria
	•	naming conventions
	•	file structure rules
	•	PR requirements defined
	•	doc update policy defined

Handoff
PM → Documentation Owner → Team → PM

⸻

⸻

🟫 EPIC 2 — C4 Model (Structurizr DSL)

⸻

🎫 AGSYS-2803 — System Context Diagram

Description
Описати систему на рівні Context.

Acceptance Criteria
	•	external actors визначені
	•	system boundaries описані
	•	взаємодії описані
	•	diagram renderable

Handoff
PM → Architect → Developer → QA → PM

⸻

🎫 AGSYS-2804 — Container Diagram

Description
Описати всі основні сервіси.

Acceptance Criteria
	•	control plane
	•	runtime
	•	workers
	•	governance
	•	telemetry
	•	storage
	•	UI
	•	взаємодії описані

Handoff
PM → Architect → Developer → QA → PM

⸻

🎫 AGSYS-2805 — Component-Level Diagram (Key Modules)

Description
Деталізувати ключові компоненти.

Acceptance Criteria
	•	control plane components описані
	•	runtime components описані
	•	governance components описані
	•	dependency relationships є

Handoff
PM → Architect → Backend → QA → PM

⸻

⸻

🟫 EPIC 3 — arc42 Documentation Layer

⸻

🎫 AGSYS-2806 — arc42 Skeleton

Description
Створити базову структуру arc42.

Acceptance Criteria
	•	всі розділи створені:
	•	introduction
	•	building blocks
	•	runtime view
	•	deployment view
	•	risks
	•	файли структуровані
	•	markdown формат

Handoff
PM → Documentation Owner → PM

⸻

🎫 AGSYS-2807 — Runtime View Documentation

Description
Описати runtime flow системи.

Acceptance Criteria
	•	описано execution flow
	•	описано agent orchestration
	•	описано governance interaction
	•	описано control plane interaction

Handoff
PM → Architect → Developer → QA → PM

⸻

🎫 AGSYS-2808 — Deployment View Documentation

Description
Описати deployment модель.

Acceptance Criteria
	•	local deployment описаний
	•	container deployment описаний
	•	future cloud model описаний
	•	dependencies описані

Handoff
PM → DevOps → Documentation Owner → PM

⸻

⸻

🟫 EPIC 4 — ADR System

⸻

🎫 AGSYS-2809 — ADR Structure & Template

Description
Створити шаблон ADR.

Acceptance Criteria
	•	template включає:
	•	context
	•	decision
	•	alternatives
	•	consequences
	•	naming convention визначено
	•	storage структура є

Handoff
PM → Architect → Documentation Owner → PM

⸻

🎫 AGSYS-2810 — Seed ADRs (Core Decisions)

Description
Задокументувати ключові рішення.

Acceptance Criteria
	•	мінімум 8–12 ADR:
	•	control plane
	•	environment model
	•	multi-agent runtime
	•	externalized state
	•	declarative governance
	•	всі рішення обґрунтовані
	•	пов’язані з компонентами

Handoff
PM → Architect → Developer → PM

⸻

⸻

🟫 EPIC 5 — Linking Layer

⸻

🎫 AGSYS-2811 — Code ↔ Architecture Mapping

Description
Зв’язати код з архітектурними елементами.

Acceptance Criteria
	•	кожен ключовий сервіс має mapping
	•	ключові модулі прив’язані до diagrams
	•	mapping документований
	•	легко навігувати

Handoff
PM → Developer → Documentation Owner → PM

⸻

🎫 AGSYS-2812 — ADR ↔ Components Linking

Description
Зв’язати рішення з компонентами.

Acceptance Criteria
	•	кожен ADR посилається на компонент
	•	компоненти мають список ADR
	•	traceability існує
	•	не дублюється логіка

Handoff
PM → Architect → QA → PM

⸻

⸻

🟫 EPIC 6 — Agent Context Layer

⸻

🎫 AGSYS-2813 — System Context for Agents

Description
Створити файл(и) контексту для агентів.

Acceptance Criteria
	•	опис системи є
	•	ключові принципи описані
	•	обмеження описані
	•	формат структурований (LLM-friendly)

Handoff
PM → Architect → AI Engineer → QA → PM

⸻

🎫 AGSYS-2814 — Architecture Snapshot Export

Description
Експорт контексту системи для використання агентами.

Acceptance Criteria
	•	snapshot формується
	•	включає:
	•	components
	•	flows
	•	constraints
	•	usable як prompt context
	•	versioned

Handoff
PM → Backend → AI → QA → PM

⸻

⸻

🟫 EPIC 7 — Export / Visualization

⸻

🎫 AGSYS-2815 — Diagram Rendering Pipeline

Description
Рендеринг diagrams.

Acceptance Criteria
	•	diagrams генеруються автоматично
	•	доступні у HTML/PNG/SVG
	•	легко переглядати локально
	•	consistent outputs

Handoff
PM → DevOps → QA → PM

⸻

🎫 AGSYS-2816 — Architecture Portal (Basic)

Description
Базовий перегляд архітектури.

Acceptance Criteria
	•	docs доступні локально
	•	diagrams доступні
	•	ADR доступні
	•	navigation проста

Handoff
PM → Frontend → QA → PM

⸻

⸻

🟫 EPIC 8 — Governance & Workflow Integration

⸻

🎫 AGSYS-2817 — ADR Workflow Integration

Description
Інтегрувати ADR у процес розробки.

Acceptance Criteria
	•	великі зміни вимагають ADR
	•	PR без ADR (де потрібно) блокується
	•	ADR review flow описаний
	•	історія змін фіксується

Handoff
PM → Team → QA → PM

⸻

🎫 AGSYS-2818 — Architecture Sync Policy

Description
Політика синхронізації коду і архітектури.

Acceptance Criteria
	•	правило: code change → doc update
	•	правила описані
	•	перевірка в PR
	•	не допускається drift

Handoff
PM → Team → QA → PM

⸻

⸻

🟫 EPIC 9 — Validation

⸻

🎫 AGSYS-2819 — Architecture Consistency Audit

Description
Перевірка узгодженості.

Acceptance Criteria
	•	diagrams відповідають коду
	•	ADR відповідають реалізації
	•	runtime flows відповідають опису
	•	inconsistencies задокументовані

Handoff
PM → QA → Architect → PM

⸻

🎫 AGSYS-2820 — Agent Comprehension Test

Description
Перевірити, чи агент розуміє систему.

Acceptance Criteria
	•	агент може пояснити архітектуру
	•	агент правильно визначає компоненти
	•	агент не вигадує структуру
	•	agent answers consistent

Handoff
PM → AI Engineer → QA → PM

⸻

🧠 Definition of Done — Sprint 28

⸻

Спринт завершений, якщо:
	•	є C4 модель
	•	є arc42 документація
	•	є ADR система
	•	є зв’язки code ↔ architecture ↔ decisions
	•	є agent-readable context
	•	документація реально використовується
	•	архітектура не “в голові”

⸻

📊 Результат

⸻

До:
	•	хаотичні знання
	•	рішення губляться
	•	складно масштабувати

⸻

Після:
	•	є карта системи
	•	є історія рішень
	•	є контекст для агентів
	•	є контроль складності

⸻

💥 Найважливіше

⸻

Sprint 28 — це:

❗ не про документацію
❗ а про контроль складності системи

⸻
