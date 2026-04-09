🟦 Sprint 18 — FINAL VALIDATION PACK (Observability Layer)

⸻

🎯 Ціль перевірки

Підтвердити, що Cockpit:

❗ не просто красивий UI
❗ а джерело правди про runtime

⸻

🧩 SECTION 1 — Execution Transparency

⸻

1.1 Full Execution Visibility
	•	Чи видно ВСІ кроки execution?
	•	agent invocation
	•	handoff
	•	stage changes
	•	tool usage

⸻

1.2 No Summary-Only Mode
	•	Чи UI НЕ показує тільки фінальний результат?
	•	Чи видно проміжні кроки?

⸻

1.3 Event-based Rendering
	•	Чи UI базується на:
	•	event bus
	•	runtime events
	•	А НЕ на:
	•	згенерованому тексті LLM

⸻

🔥 КРИТИЧНЕ ПИТАННЯ
	•	Чи можна відтворити execution тільки по UI?

⸻

🧩 SECTION 2 — Timeline (Codex-style)

⸻

2.1 Timeline Exists
	•	Чи є timeline execution?

⸻

2.2 Timeline Accuracy
	•	Чи порядок подій відповідає реальному runtime?
	•	Чи timestamps реальні?

⸻

2.3 Handoff Visualization
	•	Чи видно:
	•	agent → agent transition?
	•	Чи видно, хто передав задачу?

⸻

2.4 Parallel Awareness
	•	Чи видно overlap execution (для multiple_agents)?
	•	Чи timeline не примусово лінійний?

⸻

🧩 SECTION 3 — Governance Visibility

⸻

3.1 Rule Visibility
	•	Чи видно:
	•	rule
	•	evaluator
	•	result
	•	action

⸻

3.2 Violation Tracking
	•	Чи видно:
	•	guard triggered
	•	retry
	•	block

⸻

3.3 Deterministic Data
	•	Чи UI показує:
	•	evaluator outputs (реальні)
	•	А НЕ:
	•	LLM пояснення

⸻

🔥 КРИТИЧНЕ
	•	Чи можна зрозуміти “чому система зупинилася”?

⸻

🧩 SECTION 4 — Loop Visibility

⸻

4.1 Loop Types
	•	Чи видно:
	•	verification loop
	•	improvement loop
	•	retry loop

⸻

4.2 Loop Execution
	•	Чи видно:
	•	коли loop запустився
	•	скільки разів
	•	результат

⸻

4.3 Loop Trigger Reason
	•	Чи видно:
	•	чому loop запустився?

⸻

🔥 КРИТИЧНЕ
	•	Чи видно loop як окрему сутність, а не просто “повтор відповіді”?

⸻

🧩 SECTION 5 — Planning Layer

⸻

5.1 Plan Visibility
	•	Чи видно execution plan (JSON)?

⸻

5.2 Plan Content
	•	Чи видно:
	•	agents
	•	skills
	•	tools

⸻

5.3 Plan vs Execution
	•	Чи можна порівняти:
	•	planned vs actual?

⸻

🔥 КРИТИЧНЕ
	•	Чи видно, що система НЕ виконала план?

⸻

🧩 SECTION 6 — Tool Usage

⸻

6.1 Tool Calls
	•	Чи видно:
	•	який tool викликаний
	•	ким
	•	коли

⸻

6.2 Tool Results
	•	Чи видно результат tool execution?

⸻

6.3 Workbench Integration
	•	Чи видно:
	•	queue / lock / usage?

⸻

⸻

🧩 SECTION 7 — Token & Cost Tracking

⸻

7.1 Token Visibility
	•	Чи видно:
	•	tokens per run
	•	tokens per agent

⸻

7.2 Accuracy
	•	Чи дані відповідають реальним LLM calls?

⸻

7.3 Granularity
	•	Чи можна побачити:
	•	який саме крок “зʼїв” токени?

⸻

🧩 SECTION 8 — Debug Mode

⸻

8.1 Prompt Logs
	•	Чи доступні:
	•	input prompt
	•	output prompt

⸻

8.2 LLM Calls
	•	Чи видно:
	•	кожен LLM виклик?

⸻

8.3 Raw Mode
	•	Чи є режим без UI фільтрів?

⸻

🔥 КРИТИЧНЕ
	•	Чи можна дебажити систему без коду?

⸻

🧩 SECTION 9 — UI Truthfulness (САМА ГОЛОВНА ЧАСТИНА)

⸻

9.1 No Fake Messages
	•	Чи UI НЕ вставляє:
	•	“system messages”
	•	“thinking messages”
які не існують в runtime?

⸻

9.2 Separation of Streams
	•	Чи відділені:
	•	artifact logs
	•	user messages
	•	system events

⸻

9.3 No Mixed Messages
	•	Чи немає:
	•	“2 повідомлення в одному”
(як ти описував проблему)

⸻

🔥 КРИТИЧНЕ
	•	Чи кожне повідомлення = 1 реальний event?

⸻

🧩 SECTION 10 — Real-time Behavior

⸻

10.1 Streaming
	•	Чи UI показує процес в runtime?

⸻

10.2 No Final Dump Only
	•	Чи немає:
	•	тільки фінального response?

⸻

10.3 Latency
	•	Чи UI не затримує events?

⸻

🧩 SECTION 11 — Integration with Sprint 19

⸻

🔥 Дуже важливо
	•	Чи UI вже готовий працювати з:
	•	workerId
	•	projectId
	•	lifecycle states

⸻

🔥 ПИТАННЯ
	•	Чи UI ламається при реальному multiple_agents?

⸻

🧩 SECTION 12 — Final Reality Check

⸻

❗ Питання 1
	•	Чи Cockpit показує:
	•	реальність?
	•	чи інтерпретацію?

⸻

❗ Питання 2
	•	Чи можна знайти причину бага без відкриття коду?

⸻

❗ Питання 3
	•	Чи UI дозволяє відтворити run?

⸻

❗ Питання 4
	•	Чи UI не вводить в оману?

⸻

🧾 REQUIRED OUTPUT

⸻

Агент має повернути:

⸻

1. Status
	•	✅ Ready
	•	⚠️ Partial
	•	❌ Not Ready

⸻

2. Evidence
	•	скріншоти / logs / traces

⸻

3. Critical gaps

⸻

4. Misleading UI risks

(це дуже важливо)

⸻

5. Recommendation

⸻

💥 Найважливіший інсайт

Sprint 18 — це не “UI спринт”

👉 це:

❗ “джерело правди системи”

⸻