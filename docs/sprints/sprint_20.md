Так, це логічно. Після Sprint 19 старий UI-спринт уже недостатній, бо він був про загальну observability, а тепер у вас з’являється новий backend contract саме для real multiple_agents mode.

Тобто я б не просто “додав пару тікетів”, а зробив так:

Sprint 20 — Cockpit UI Upgrade for Real Multi-Agent Runtime

І він має:
	•	взяти базу зі старого UI/observability спринта;
	•	розширити її під новий distributed runtime;
	•	синхронізувати frontend із новими swarm/backend contract-ами.

⸻

Навіщо окремий спринт

Бо після Sprint 19 у вас змінюється сама природа даних у UI:

Раніше:
	•	UI показував майже “симуляцію” агентів;
	•	standby/active були скоріше відображенням подій.

Тепер:
	•	є реальні worker-и;
	•	є project-scoped agents;
	•	є hot/cold і active/standby як різні виміри;
	•	є heartbeat, queue, assigned task, spawn/despawn, project switch policy.

Це вже не просто косметичний апдейт, а новий UI layer.

⸻

Що б я зробив зі старим UI-спринтом

Не переписував би його, а зробив би так:

Sprint 18

Лишаємо як:
	•	execution timeline
	•	governance visibility
	•	loops
	•	planning
	•	cost/debug

Sprint 20

Робимо як:
	•	real swarm / worker runtime UI
	•	project-scoped runtime control
	•	multiple_agents mode visibility
	•	resource state visualization

Тобто:
	•	Sprint 18 = observability layer
	•	Sprint 20 = distributed runtime control layer

⸻

Sprint 20 — Description

🎯 Goal

Оновити Cockpit UI так, щоб він коректно і повно відображав реальний distributed multi-agent runtime, а не quasi-linear imitation.

⸻

Problem Statement

Після переходу на справжній multiple_agents режим поточний UI стає недостатнім, бо:
	•	не показує project-scoped worker entities;
	•	не розрізняє:
	•	hot/cold
	•	active/standby;
	•	не показує:
	•	heartbeats
	•	queue pressure
	•	assigned tasks
	•	worker lifecycle transitions;
	•	не дає зрозуміти, чи працює справжній multiple mode, чи fallback/quasi-linear.

⸻

Scope

✔️ Входить
	•	swarm controller 2.0
	•	worker state view
	•	project-scoped agent roster
	•	queue / task dispatch view
	•	mode-specific indicators
	•	lifecycle and heartbeat visibility
	•	project switch runtime visualization

❌ Не входить
	•	новий backend runtime
	•	нові evaluator-и
	•	governance engine changes
	•	autoscaling logic

⸻

Основні блоки Sprint 20

1. Swarm Controller 2.0

Правий сайдбар має показувати реальних worker-ів, а не просто умовні agent labels.

Потрібно відображати:
	•	project-scoped agent identity
	•	workerId / instance
	•	enabled / disabled
	•	hot / cold
	•	active / standby
	•	starting / stopping / failed
	•	heartbeat freshness
	•	assigned task

⸻

2. Multiple Mode Indicator

UI має прямо показувати:
	•	quasi-linear
	•	multiple_agents

І для multiple_agents треба підтверджувати, що це:
	•	distributed worker backend
	•	а не імітація.

⸻

3. Project-Scoped Agent View

Для кожного відкритого проєкту треба показувати:
	•	які агенти для нього доступні;
	•	які з них loaded;
	•	які з них currently hot;
	•	які cold;
	•	хто реально піднятий як процес.

⸻

4. Queue & Dispatch Visibility

Потрібно бачити:
	•	queue depth per project;
	•	waiting tasks;
	•	which worker picked which task;
	•	dispatch latency.

⸻

5. Lifecycle Timeline

Окремо або як частина timeline:
	•	worker spawned
	•	worker became hot
	•	task assigned
	•	worker active
	•	worker idle/standby
	•	worker demoted to cold
	•	worker failed/restarted

⸻

6. Project Switch Runtime Feedback

Коли юзер перемикає проєкт, UI має показати:
	•	що сталося з active runtime set;
	•	які workers прогрілися;
	•	які були demoted;
	•	чи є delayed cold-start.

⸻

7. Resource/Pressure Indicators

Потрібні хоча б базові індикатори:
	•	active worker count
	•	hot worker count
	•	queue pressure
	•	cold start count
	•	stale worker warnings

⸻

Success Criteria

✅ Real multiple_agents видно

Користувач може відрізнити:
	•	quasi-linear
	•	real distributed multi-agent

без читання логів backend.

✅ Swarm Controller правдивий

Він показує реальний runtime state, а не похідну від останніх подій.

✅ Project isolation видно

UI не змішує агентів різних проєктів.

✅ Lifecycle зрозумілий

Видно, що агент:
	•	cold
	•	hot
	•	active
	•	standby
	•	failed

✅ Queue/dispatch зрозумілі

Видно, чому задача чекає, хто її виконує, де bottleneck.

⸻

Як це пов’язати з попереднім UI-спринтом

Я б зафіксував так:
	•	Sprint 18: general observability cockpit
	•	Sprint 20: distributed multi-agent runtime cockpit

Тобто Sprint 20 — це не заміна, а розширення і конкретизація UI під backend changes із Sprint 19.

⸻