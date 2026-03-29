# 🟫 Governance MVP Definition (v1)

## 🎯 Мета

Впровадити мінімальний governance layer, який:
	•	не залежить від LLM-дисципліни
	•	базується на evidence (events + artifacts + telemetry)
	•	може зупиняти / повертати / примушувати виконання
	•	не створює жорсткого coupling з agent files

---

## 🧠 Принцип (зафіксувати!)

LLM може сказати, що зробила. Governance має це довести.

---

## 🧩 СКОУП MVP

Включаємо тільки 6 правил:
	1.	Git Preflight
	2.	Required Agent Participation
	3.	Required Pipeline Usage
	4.	Improvement Loop
	5.	Postflight / Completion Evidence
	6.	Cost Guard (light)

👉 цього достатньо, щоб система стала керованою

---

## 📦 RULE 1 — Git Preflight Gate

### Trigger
before_execution

### Expected Evidence
	•	preflight token exists
	•	branch assigned
	•	worktree assigned

### Evidence Source
	•	.env preflight token
	•	run ledger / git event

### Evaluation (deterministic)
if (!preflight_token || !branch || !worktree) → FAIL

### Enforcement
mode: HARD_GATE

### Behavior
	•	блокувати execution
	•	викликати GitFlow Manager
	•	повторити перевірку

---

## 📦 RULE 2 — Required Agent Participation

### Trigger
after_execution

### Expected Evidence
	•	swarm events містять required agents

### Evidence Source
	•	Event Bus (stage.started / completed)

### Evaluation
requiredAgents ⊆ actualAgents

### Enforcement
mode: SOFT_GATE

### Behavior
	•	якщо не всі агенти:
	•	ask: “чому не використано?”
	•	retry execution (1 раз)
	•	логувати deviation

---

## 📦 RULE 3 — Required Pipeline Usage

### Trigger
after_execution

### Expected Evidence
	•	pipeline stages events

### Evidence Source
	•	runtime events (stage.started)

### Evaluation
requiredStages ⊆ executedStages

### Enforcement
mode: SOFT_GATE

### Behavior
	•	retry з explicit instruction:
	•	“use pipeline X”
	•	якщо вдруге fail → log violation

---

## 📦 RULE 4 — Improvement Loop

### Trigger
before_task_close

### Expected Evidence
	•	improvement artifact існує:
	•	ticket / note / report

### Evidence Source
	•	Plane (ticket)
	•	artifact storage

### Evaluation
if (!improvement_artifact) → FAIL

### Enforcement
mode: SOFT_GATE

### Behavior
	1.	запит:
	•	“чи дійсно все ідеально?”
	2.	якщо ні → створити artifact
	3.	якщо вдруге нема → log deviation

---

## 📦 RULE 5 — Postflight / Completion Evidence

### Trigger
before_task_close

### Expected Evidence
	•	test report
	•	closure evidence
	•	artifacts

### Evidence Source
	•	docs/process/tests/*
	•	logs / files

### Evaluation
if (!requiredArtifactsExist) → FAIL

### Enforcement
mode: HARD_GATE

### Behavior
	•	заборонити task completion
	•	повернути в execution

---

## 📦 RULE 6 — Cost Guard (Light)

### Trigger
after_run

### Expected Evidence
	•	token usage

### Evidence Source
	•	LLM wrapper logs

### Evaluation
if (tokens > threshold) → WARNING

### Enforcement
mode: ADVISORY

### Behavior
	•	log
	•	показати в UI
	•	не блокувати (MVP)

---

## 🧠 Enforcement Levels (ВАЖЛИВО)

```typescript
type Enforcement =
  | 'HARD_GATE'   // блокує рух
  | 'SOFT_GATE'   // retry / ask / warn
  | 'ADVISORY'    // тільки лог
```

---

## 🧠 Evidence Confidence

```typescript
type Evidence =
  | 'STRONG'   // файл, ledger, event
  | 'MEDIUM'   // telemetry
  | 'WEAK'     // LLM текст
```

👉 MVP використовує:
	•	тільки STRONG + частково MEDIUM
	•	WEAK = не вважається доказом

---

## 🔄 Execution Flow (MVP)

1. **Task Start**
   ↓
2. **[Rule 1: Git Preflight]**
   ↓
3. **Execution**
   ↓
4. **[Rule 2: Agent Usage]**
5. **[Rule 3: Pipeline Usage]**
   ↓
6. **Before Close**
   ↓
7. **[Rule 4: Improvement Loop]**
8. **[Rule 5: Postflight]**
   ↓
9. **Complete**
   ↓
10. **[Rule 6: Cost Analysis]**

---

## 🧩 Policy Binding (мінімальний)

Поки без складної системи:

```json
{
  "projectId": "...",
  "enabledRules": [
    "git_preflight",
    "agent_usage",
    "pipeline_usage",
    "improvement",
    "postflight",
    "cost"
  ]
}
```

---

## 🧩 ЩО НЕ ВХОДИТЬ В MVP (ВАЖЛИВО)

❌ Workbench enforcement
❌ full skill governance
❌ dynamic rule selection
❌ complex planner agent
❌ multi-level cost optimization

👉 це все піде в Sprint 6+ (далі)

---

## 🧪 Мінімальні Acceptance Criteria

MVP вважається працюючим, якщо:
	1.	❌ неможливо стартувати без git preflight
	2.	❌ неможливо закрити задачу без artifacts
	3.	⚠️ система реагує на missing agents/pipelines
	4.	⚠️ improvement loop не ігнорується
	5.	📊 видно token usage

---

## 🧠 ЩО ТИ ОТРИМАЄШ ПІСЛЯ MVP

👉 система перестає бути “LLM-driven”
👉 стає policy-driven runtime
