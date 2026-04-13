🟪 Sprint 35 — Verification Pack

⸻

🧩 SECTION 1 — Asset Registry (35A)

1.1 Registry Coverage
	•	Чи всі declarative assets реєструються в registry?
	•	agents
	•	pipelines
	•	skills
	•	loops
	•	governance profiles
	•	meeting specs
	•	templates
	•	Чи є хоч один asset, який використовується runtime, але відсутній у registry?

👉 PASS: всі assets мають registry entry
👉 FAIL: хоча б один asset існує тільки як файл

⸻

1.2 Source of Truth
	•	Чи можливе використання asset без registry lookup?
	•	Чи є код, який читає asset напряму з FS, оминаючи registry?

👉 PASS: registry = єдине джерело істини
👉 FAIL: runtime читає файли напряму

⸻

1.3 Identity
	•	Чи кожен asset має стабільний asset_id?
	•	Чи однакові assets не створюють дублікати?

👉 PASS: немає дублювання / колізій
👉 FAIL: asset дублюється або губиться

⸻

⸻

🧩 SECTION 2 — Lineage & Templates

2.1 Lineage Tracking
	•	Чи можна визначити, з якого template створений asset?
	•	Чи зберігається source_template_version?

👉 PASS: lineage повністю відновлюється
👉 FAIL: походження asset невідоме

⸻

2.2 Customization Level
	•	Чи система розрізняє:
	•	generated
	•	modified
	•	custom?

👉 PASS: всі 3 стани визначаються
👉 FAIL: всі assets виглядають однаково

⸻

2.3 Template Safety
	•	Чи зміна template НЕ змінює існуючі проекти автоматично?

👉 PASS: backward compatibility
👉 FAIL: template mutation ламає існуючі проекти

⸻

⸻

🧩 SECTION 3 — Dependency Graph

3.1 Dependency Registration
	•	Чи система знає:
	•	які loops використовують agent?
	•	які pipelines використовують skill?
	•	які meeting specs використовують agents?

👉 PASS: dependency graph існує
👉 FAIL: залежності тільки імпліцитні

⸻

3.2 Impact Analysis
	•	Чи викликається impact analysis перед:
	•	delete
	•	replace
	•	edit?

👉 PASS: є impact report
👉 FAIL: зміни виконуються “всліпу”

⸻

3.3 Safe Delete
	•	Чи можна видалити asset, який використовується?

👉 PASS: delete блокується
👉 FAIL: система дозволяє і ламається

⸻

⸻

🧩 SECTION 4 — Validation Pipeline

4.1 Pre-Ingestion Validation
	•	Чи всі імпортовані assets проходять validation?
	•	Чи можливий імпорт без validation?

👉 PASS: validation обов’язковий
👉 FAIL: можна обійти validation

⸻

4.2 Validation Types
	•	Чи перевіряється:
	•	schema
	•	memory usage
	•	tools
	•	artifacts
	•	governance contracts?

👉 PASS: повний набір перевірок
👉 FAIL: перевіряється тільки формат

⸻

4.3 Invalid Assets Handling
	•	Чи є quarantine?
	•	Чи invalid assets НЕ попадають у runtime?

👉 PASS: isolation працює
👉 FAIL: невалідні assets використовуються

⸻

⸻

🧩 SECTION 5 — Initialization Flow

5.1 Init Pipeline
	•	Чи init працює як:

discover → validate → normalize → register → activate



👉 PASS: повний pipeline
👉 FAIL: прямий import

⸻

5.2 Existing Repo Import
	•	Що стається, якщо в repo є agent файли?

👉 PASS:
	•	вони валідовані
	•	нормалізовані
	•	зареєстровані

👉 FAIL:
	•	просто підхоплюються і використовуються

⸻

⸻

🧩 SECTION 6 — Registry ↔ FS Consistency

6.1 Drift Detection
	•	Чи система бачить:
	•	файл без registry
	•	registry без файла?

👉 PASS: drift детектиться
👉 FAIL: silent inconsistency

⸻

6.2 Reconciliation
	•	Чи є механізм виправлення drift?

👉 PASS: є job/manual fix
👉 FAIL: руками правити

⸻

⸻

🧩 SECTION 7 — Approval System

7.1 Approval Lanes
	•	Чи є 3 рівні:
	•	workspace
	•	template
	•	product?

👉 PASS: всі 3 є
👉 FAIL: один загальний approval

⸻

7.2 Approval Required
	•	Чи можна змінити asset без approval?

👉 PASS: ні
👉 FAIL: можна

⸻

7.3 Fallback
	•	Що відбувається, якщо approver відсутній?

👉 PASS: fallback/timeout
👉 FAIL: зависання

⸻

⸻

🟪 SECTION 8 — Self-Improvement Signals (35B)

8.1 Runtime Signals
	•	Чи збираються:
	•	retries
	•	failures
	•	token usage
	•	latency?

👉 PASS: повний набір
👉 FAIL: частково / відсутній

⸻

8.2 Governance Signals
	•	Чи логуються loop outcomes?

👉 PASS: так
👉 FAIL: ні

⸻

8.3 Telemetry
	•	Чи є crash + error tracking?

👉 PASS: інтегровано
👉 FAIL: немає

⸻

⸻

🟪 SECTION 9 — Pattern Detection

9.1 Aggregation
	•	Чи агрегуються сигнали по:
	•	asset
	•	workspace
	•	template?

👉 PASS: так
👉 FAIL: сирі дані

⸻

9.2 Pattern Detection
	•	Чи знаходяться recurring issues?

👉 PASS: так
👉 FAIL: ні

⸻

9.3 Noise Filtering
	•	Чи одиничні кейси НЕ стають proposals?

👉 PASS: threshold працює
👉 FAIL: шум → proposals

⸻

⸻

🟪 SECTION 10 — Proposal System

10.1 Proposal Generation
	•	Чи генеруються proposals?

👉 PASS: так
👉 FAIL: ні

⸻

10.2 Proposal Structure
	•	Чи містить proposal:
	•	опис
	•	зміни
	•	target asset
	•	impact?

👉 PASS: повний
👉 FAIL: “текст без структури”

⸻

⸻

🟪 SECTION 11 — Classification & Routing

11.1 Classification
	•	Чи proposal класифікується:
	•	workspace
	•	template
	•	product?

👉 PASS: так
👉 FAIL: ні

⸻

11.2 Routing
	•	Чи proposal доходить до правильного owner?

👉 PASS: так
👉 FAIL: губиться

⸻

⸻

🟪 SECTION 12 — Approval & Apply

12.1 Review
	•	Чи user бачить proposals?
	•	Чи може approve/reject?

👉 PASS: так
👉 FAIL: ні

⸻

12.2 Simulation
	•	Чи change перевіряється перед apply?

👉 PASS: так
👉 FAIL: застосовується одразу

⸻

12.3 Apply Safety
	•	Чи:
	•	оновлюється registry
	•	оновлюється lineage
	•	можливий rollback?

👉 PASS: атомарно
👉 FAIL: часткові зміни

⸻

⸻

🟪 SECTION 13 — Template Learning

13.1 Promotion
	•	Чи recurring fixes стають template candidates?

👉 PASS: так
👉 FAIL: ні

⸻

13.2 Versioning
	•	Чи templates versioned?

👉 PASS: так
👉 FAIL: overwrite

⸻

⸻

🟪 SECTION 14 — Product Learning

14.1 Ticket Creation
	•	Чи product proposals → tickets?

👉 PASS: так
👉 FAIL: губляться

⸻

14.2 Protected Areas
	•	Чи system code НЕ мутується автоматично?

👉 PASS: так
👉 FAIL: unsafe mutation

⸻

⸻

🟪 SECTION 15 — End-to-End Scenarios

Scenario 1 — Import project
	•	invalid asset → quarantine
	•	valid → registry

⸻

Scenario 2 — Delete agent
	•	якщо використовується → блок

⸻

Scenario 3 — Runtime failure
	•	pattern → proposal

⸻

Scenario 4 — Workspace fix
	•	proposal → approve → apply

⸻

Scenario 5 — Template improvement
	•	recurring → template suggestion

⸻

Scenario 6 — Product issue
	•	telemetry → ticket

⸻

⸻

🚨 FAIL CONDITIONS (Critical)

Спринт ВВАЖАЄТЬСЯ ПРОВАЛЕНИМ, якщо:
	•	❌ можна змінити asset без registry
	•	❌ немає dependency graph
	•	❌ можна видалити asset з залежностями
	•	❌ self-improvement змінює щось без approval
	•	❌ немає validation pipeline
	•	❌ template changes ламають існуючі проекти
	•	❌ product code мутується автоматично

⸻

✅ FINAL RESULT

Якщо все PASS:

Ти отримуєш:

🔥 систему, яка може самооновлюватись без втрати контролю

⸻
