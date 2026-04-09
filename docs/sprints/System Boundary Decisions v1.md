Супер. Тоді фіксуємо остаточний документ без TBD — як canonical source of truth.

⸻

🟪 System Boundary Decisions v1

Date: 2026-04-09
Status: FINAL (approved)
Scope: Platform architecture, settings boundaries, SaaS model, governance, runtime

⸻

1. Executive Summary

Система переходить у:

SaaS-first, multi-agent-only platform

Ключові рішення:
	•	❗ Multiple Agents — єдиний runtime режим
	•	❗ Повне видалення mock / quasi-linear
	•	❗ Чіткий розподіл: Client / Governance / Control Plane
	•	❗ Repository-first onboarding
	•	❗ Declarative governance як core продуктова фіча
	•	❗ Control plane — повністю ізольований від client UX

⸻

2. Runtime Model (FINAL)

✅ Decision
	•	Єдиний режим:
Multiple Agents

❌ Removed
	•	mock mode — видалити повністю
	•	quasi-linear — видалити повністю
	•	всі згадки, налаштування, fallback-и — видалити

Consequences
	•	❗ спрощення архітектури
	•	❗ немає dual logic paths
	•	❗ немає debug/runtime confusion
	•	❗ всі системи орієнтовані на multi-agent execution

UI Impact
	•	runtime mode selector → ❌ видалити
	•	execution mode → ❌ видалити
	•	fallback logic → ❌ видалити

⸻

3. Layered Access Model (FINAL)

Layer	Назва	Хто	Що контролює
L0	Platform	Owner / System	runtime, infra, safety
L1	Tenant	Org Admin	org policy
L2	Workspace/Project	Team Admin	project governance
L3	Session/Run	User	execution


⸻

4. Settings Boundaries (FINAL)

⸻

4.1 Client / Workspace Settings (L3/L2-lite)

✅ Allowed
	•	language / locale
	•	appearance
	•	notifications
	•	provider credentials
	•	provider test
	•	model selection (allowed only)
	•	basic preferences

❌ Forbidden
	•	runtime mode
	•	sandbox/full access
	•	execution target
	•	git/worktree internals
	•	governance internals
	•	MCP topology
	•	swarm controls

⸻

4.2 Project Governance Layer (L2)

✅ Allowed
	•	enable/disable rules
	•	loop profiles
	•	thresholds
	•	evidence definitions
	•	project-specific overrides
	•	domain profiles (engineering/marketing/etc)

❗ Constraints
	•	тільки в межах allowed evaluators
	•	не можна додавати arbitrary execution logic

⸻

4.3 Platform Control Plane (L0/L1)

✅ Only here
	•	runtime orchestration
	•	swarm control
	•	MCP inventory
	•	service lifecycle
	•	environment policy
	•	safety rails
	•	cost controls
	•	debug tools

❌ Not visible to client
	•	всі internal runtime controls
	•	всі infra controls
	•	всі unsafe toggles

⸻

5. Repository Onboarding (FINAL)

⸻

✅ Production path
	•	repository-first onboarding
	•	через:
	•	Git provider app
	•	OAuth / PAT

⸻

❌ Deprecated
	•	local folder як primary flow

⸻

✅ Local mode
	•	allowed тільки як:
	•	dev mode
	•	debug profile

⸻

Behavior when no agent config
	•	не блокувати запуск
	•	запускати bootstrap flow:
	•	create template
	•	або read-only mode

⸻

6. Governance Model (FINAL)

⸻

6.1 Split model

Platform Governance (L0/L1)
	•	hard safety rules
	•	non-disableable rules
	•	evaluator registry
	•	compliance constraints
	•	cost guardrails

⸻

Project Governance (L2)
	•	loops
	•	rules
	•	profiles
	•	overrides
	•	thresholds

⸻

User (L3)
	•	обмежені runtime overrides
	•	тільки в межах policy

⸻

6.2 Rule lifecycle
	•	rules defined declaratively
	•	stored:
	•	partially in repo
	•	partially in control plane

⸻

6.3 User-created rules

✅ Allowed
	•	створення rule на базі existing evaluator
	•	зміна параметрів
	•	зміна triggers

❌ Not allowed
	•	створення нового evaluator типу
	•	arbitrary execution logic

⸻

7. Git / Worktree Policy (FINAL)

⸻

✅ Engineering projects
	•	git isolation → default ON

⸻

✅ Non-engineering
	•	git flow → optional / disabled

⸻

Decision
	•	policy driven by project profile
	•	НЕ system-wide mandatory

⸻

8. MCP / Workbench Isolation (FINAL)

⸻

Classification

Level	Scope
Global	platform-safe
Tenant	org-shared
Workspace	project-scoped
Session	isolated


⸻

Secrets storage

Scope	Where
Tenant	org secrets
Workspace	project secrets
User	user secrets


⸻

Execution rules
	•	unsafe MCP → isolated
	•	mutable MCP → isolated
	•	shared MCP → policy controlled

⸻

9. Swarm Control (FINAL)

⸻

L0 Platform
	•	full control:
	•	pause
	•	restart
	•	kill
	•	rebalance

⸻

L1 Tenant
	•	limited:
	•	restart workspace environment

⸻

L2/L3 Users
	•	❌ no swarm control

Instead:
	•	retry task
	•	cancel run

⸻

UI rule
	•	swarm ≠ chat UI
	•	swarm = control plane only

⸻

10. Runtime Control Visibility (FINAL)

⸻

Hidden from client:
	•	branch/worktree
	•	execution targets
	•	sandbox/full-access
	•	runtime internals

⸻

Visible:
	•	only product-level abstractions

⸻

11. Profiles Model (FINAL)

⸻

Local / Dev
	•	full visibility
	•	debug controls
	•	manual overrides

⸻

SaaS Production
	•	repository onboarding
	•	role-based visibility
	•	hidden internals
	•	strict policy enforcement

⸻

12. Key Architectural Principles

⸻

1. No Mixed Layers

Client ≠ Governance ≠ Control Plane

⸻

2. No Debug Leakage

Dev controls never appear in SaaS UX

⸻

3. Declarative Core

Rules, loops, policies — declarative

⸻

4. Multi-Agent First

Everything designed for multi-agent runtime

⸻

5. Policy Over Toggle

No random toggles — only policy-driven behavior

⸻

13. Critical Removals (MANDATORY)

⸻

Must delete:
	•	mock runtime
	•	quasi-linear runtime
	•	runtime mode selector
	•	all related flags
	•	fallback logic

⸻

Must clean:
	•	dead settings
	•	unused toggles
	•	stub UI

⸻

14. Resulting Architecture Shift

⸻

Before
	•	mixed UX
	•	debug leakage
	•	unclear ownership
	•	multiple runtime paths

⸻

After
	•	clean SaaS architecture
	•	clear ownership boundaries
	•	single runtime model
	•	predictable system behavior

⸻

15. Final Statement

⸻

❗ Система більше не є “чатом з налаштуваннями”

Вона стає:

Multi-agent execution platform з чітко розділеними рівнями управління

⸻

🚀 Next Step

На базі цього документа:
	1.	👉 Settings IA Remediation Spec
	2.	👉 UI split:
	•	Workspace Settings
	•	Governance Center
	•	Control Plane
	3.	👉 Cleanup sprint (видалення legacy)

⸻
