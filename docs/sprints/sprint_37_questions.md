Окей. Робимо жорсткий Verification Pack для Sprint 37, щоб перевірити не “чи порозкладали папки”, а чи справді з’явилась нова архітектурна форма системи.

І тут важливо: цей пак має перевіряти саме ті ризики, які показав аудит:
	•	фізичний моноліт попри логічну модульність,
	•	god-object backend,
	•	повний Docker build context,
	•	слабке data ownership,
	•	відсутність чітких deploy boundaries.  ￼

⸻

🟪 Sprint 37 — Verification Pack

Theme: Architecture Refactor & Repository Topology Foundation

⸻

1. Executive Goal

Підтвердити, що після Sprint 37 система:
	•	більше не є фізичним “backend blob”
	•	має реальні package/app boundaries
	•	має чіткі deploy units
	•	не будується як “COPY . . and pray”
	•	не тримає хаотичні cross-domain imports
	•	готова до наступних кроків:
	•	35.5B interface separation
	•	36 product layer
	•	подальшого cloud/service split

⸻

2. Repository Topology Verification

2.1 Top-level structure

Перевірити, що repo реально перейшов у multi-package monorepo shape.

Очікування
	•	існує apps/
	•	існує packages/
	•	frontend більше не висить окремим без boundary
	•	нова структура відображає architecture domains

FAIL, якщо
	•	файли просто перекладені косметично
	•	root лишився “все всюди”
	•	немає чіткого поділу app vs package

⸻

2.2 App boundaries

Перевірити, що apps — це саме deployable / runnable units, а не ще одна папка “для порядку”.

Очікування
	•	client app має власний entrypoint
	•	control-plane має власний entrypoint
	•	app boundaries documented
	•	apps не містять випадковий доменний код, який мав би жити в packages

⸻

2.3 Package boundaries

Перевірити, що ключові домени реально ізольовані:

Expected packages
	•	runtime
	•	governance
	•	billing
	•	memory
	•	shared

FAIL, якщо
	•	package існує лише номінально
	•	доменний код все ще лишився в старих змішаних папках
	•	package не має public boundary

⸻

3. Backend Monolith Decomposition Verification

3.1 agentSystemBackend.ts decomposition

Аудит прямо зафіксував це як головний god-object backend.  ￼

Перевірити
	•	agentSystemBackend.ts більше не містить критичну business/control/runtime концентрацію
	•	API composition винесена
	•	runtime adapter винесений
	•	governance adapter винесений
	•	billing adapter винесений
	•	memory/storage adapter винесений

PASS
	•	файл став thin composition layer або зник як central god object

FAIL
	•	файл лишився головною точкою істини
	•	просто частину коду “перенесли”, але orchestration все ще зшите в одному місці

⸻

3.2 API handler purity

Перевірити
	•	handlers не містять доменної логіки
	•	handlers не тягнуть runtime internals напряму
	•	handlers працюють через service/domain adapter layer

FAIL
	•	API layer напряму викликає внутрішні runtime-функції без boundary

⸻

4. Domain Separation Verification

4.1 Runtime isolation

Перевірити
	•	execution/pipeline/agent logic живе у runtime package
	•	server layer не містить runtime business logic
	•	runtime може бути використаний як окремий module boundary

⸻

4.2 Governance isolation

Перевірити
	•	rules/loops/profiles/validation винесені з UI/server glue
	•	governance package має чіткий API
	•	governance не змішана з billing/runtime в одному модулі

⸻

4.3 Billing isolation

Аудит уже виділяє billing як окремий домен-кандидат.  ￼

Перевірити
	•	usage/quota/cost code живе в окремому домені
	•	billing не змішана з runtime/API handlers
	•	billing package reusable як окрема зона

⸻

4.4 Memory isolation

Перевірити
	•	memory contracts централізовані
	•	storage access не розмазаний по server/runtime/frontend
	•	memory package має public surface

⸻

4.5 Shared package discipline

Перевірити
	•	shared містить лише:
	•	types
	•	contracts
	•	utils
	•	shared не став “новим смітником”

FAIL
	•	shared містить доменну логіку
	•	shared використовується як обхід package boundaries

⸻

5. Dependency Graph Verification

5.1 Import boundaries

Перевірити
	•	немає критичних deep relative imports
	•	імпорт іде через package contract
	•	package import policy задокументована

⸻

5.2 Circular dependencies

Перевірити
	•	між ключовими пакетами немає циклів
	•	є звіт dependency graph
	•	тимчасові винятки явно задокументовані

FAIL
	•	runtime ↔ governance ↔ server ↔ shared утворюють cycle
	•	кругові залежності “просто поки лишили”

⸻

5.3 Domain crossing

Перевірити
	•	package не лізе в чужі internals
	•	cross-domain access іде тільки через public interfaces

⸻

6. Docker & Build Verification

Аудит прямо вказав, що зараз всі Dockerfiles використовують . і COPY . ., що робить rebuild усього repo та створює важкі образи.  ￼

6.1 Build context isolation

Перевірити
	•	client image не копіює весь repo
	•	control-plane image не копіює весь repo
	•	runtime image не копіює весь repo

FAIL
	•	COPY . . все ще є базовим шляхом для кожного deploy unit

⸻

6.2 Service-specific Dockerfiles

Перевірити
	•	кожен deploy unit має свій Dockerfile
	•	Dockerfile відповідає app/service boundary
	•	немає “клонованих” Dockerfiles без реальної ізоляції

⸻

6.3 Build efficiency

Перевірити
	•	multi-stage builds де потрібно
	•	.dockerignore прибирає зайвий контекст
	•	build time materially reduced
	•	image size materially reduced

⸻

7. Deploy Unit Verification

Pre-37 ставив питання, які частини мають незалежний deploy lifecycle.  ￼

7.1 Defined deploy units

Очікування
	•	client app = окремий deploy unit
	•	control-plane = окремий deploy unit
	•	runtime-plane = окремий deploy unit

⸻

7.2 Independent startup

Перевірити
	•	client можна запускати окремо
	•	control-plane можна запускати окремо
	•	runtime-plane можна запускати окремо

⸻

7.3 Config separation

Перевірити
	•	окремі env contracts
	•	окремі startup docs
	•	немає one-start-script-to-rule-them-all як єдиного шляху

⸻

8. Data Ownership Verification

Аудит назвав ownership даних FAIL: кілька сервісів сидять на тих самих strings/files без gateway, а blobs зберігаються в SQL.  ￼

8.1 Ownership matrix

Перевірити
	•	існує формальна ownership matrix:
	•	runtime data
	•	governance data
	•	billing data
	•	control-plane config
	•	memory metadata

⸻

8.2 No uncontrolled shared storage

Перевірити
	•	домени не читають/пишуть чужі дані напряму
	•	storage access іде через contracts/gateways
	•	ownership зафіксований у коді, не лише в документації

⸻

8.3 Blob strategy

Перевірити
	•	є strategy для blob/object storage
	•	SQL не використовується як смітник для великих base64 blobs
	•	metadata vs blob separation визначено

FAIL
	•	blobs усе ще спокійно живуть у SQL text fields як primary approach

⸻

9. Frontend Boundary Verification

9.1 Frontend app boundary

Перевірити
	•	frontend переміщено в app boundary
	•	frontend не змішаний з backend/runtime кодом
	•	build/dev/start живуть у client app contract

⸻

9.2 Shared UI compatibility

Перевірити
	•	UI kit / shared UI primitives готові до майбутнього split
	•	frontend не залежить на internal server spaghetti paths

⸻

10. CI/CD & Developer Workflow Verification

Аудит відмітив відсутність видимих CI workflows і selective builds.  ￼

10.1 Workspace-aware scripts

Перевірити
	•	можна запустити dev/build/test/lint на конкретний app/package
	•	root scripts не тягнуть увесь світ без потреби

⸻

10.2 Selective builds

Перевірити
	•	змінений package/app можна білдити окремо
	•	зміна в client не тригерить обов’язковий full-rebuild runtime
	•	зміна в runtime не тригерить обов’язковий full frontend rebuild

⸻

10.3 Developer clarity

Перевірити
	•	є doc “як працювати з новою topology”
	•	onboarding зрозумілий
	•	новий розробник розуміє, де:
	•	app
	•	package
	•	deploy unit
	•	shared code

⸻

11. Runtime / Control Plane Separation Verification

По дереву вже є Dockerfile.control-plane, Dockerfile.runtime-plane та service-registry config, тобто напрям уже був закладений.  ￼

11.1 Logical boundary

Перевірити
	•	runtime-plane не залежить на control-plane internals напряму
	•	control-plane не містить runtime execution logic у собі

⸻

11.2 Physical boundary

Перевірити
	•	runtime-plane та control-plane мають окремі startup contracts
	•	окремі Docker build flows
	•	окремі runtime assumptions

⸻

11.3 No fake separation

FAIL
	•	просто два Dockerfiles, але той самий code blob
	•	control-plane і runtime все ще один фізичний сервіс, лише з різними назвами

⸻

12. Architecture Classification Re-check

Після спринта треба повторно класифікувати систему.

Очікувана нова відповідь

Після Sprint 37 вона має бути ближче до:
	•	Monorepo Microservices (logical)
або
	•	Strong Modular Monolith / Multi-package Monorepo

НЕ має лишитися:
	•	“Monolith (Physical)”
у тому вигляді, який був зафіксований у аудиті.  ￼

⸻

13. End-to-End Verification Scenarios

Scenario 1 — Client build only

Змінити тільки client app.

PASS
	•	білдиться тільки client-related unit
	•	runtime/control-plane не тягнуться повністю

⸻

Scenario 2 — Runtime package change

Змінити runtime package.

PASS
	•	client app не треба перебудовувати повністю
	•	runtime build isolated

⸻

Scenario 3 — Governance route change

Змінити governance-specific code.

PASS
	•	change локалізована
	•	не тягне зайві домени

⸻

Scenario 4 — Local startup split

Запустити client/control-plane/runtime окремо.

PASS
	•	усі можуть стартувати окремо
	•	залежності зрозумілі
	•	немає прихованого one-big-start contract

⸻

Scenario 5 — Dependency impact

Видалити або перемістити internal domain file.

PASS
	•	import errors локалізовані та прозорі
	•	немає прихованого хаосу по repo

⸻

14. Critical FAIL Conditions

Sprint 37 вважається проваленим, якщо:
	•	repo лише “переклали по папках”, але межі не з’явилися
	•	agentSystemBackend.ts лишився god object
	•	Docker усе ще працює через COPY . .
	•	deploy units не можна запускати окремо
	•	data ownership лишився невизначеним
	•	circular dependencies лишилися в core domains
	•	runtime/control-plane separation декоративний, а не реальний
	•	frontend усе ще фізично/логічно змішаний із platform blob

⸻

15. Required Output Format

## Sprint 37 Verification Report

Overall: READY / PARTIAL / NOT READY

### Repository Topology
...

### Backend Decomposition
...

### Domain Packages
...

### Dependency Boundaries
...

### Docker & Build Isolation
...

### Deploy Units
...

### Data Ownership
...

### Frontend Boundary
...

### Runtime vs Control Plane
...

### Bottlenecks Removed
...

### Remaining Risks
...

### Recommendation
...


⸻

16. Final Success Definition

Sprint 37 завершений тільки якщо:
	•	physical structure finally mirrors logical architecture
	•	backend monolith is materially decomposed
	•	apps/packages/deploy units are real
	•	Docker/build isolation is fixed
	•	shared code is formalized
	•	data ownership is no longer vague
	•	the platform is ready for 35.5B and 36 without fake abstractions

⸻

17. Practical Recommendation

Після цього verification у вас має бути чітке рішення:
	•	чи 35.5B запускається одразу після 37
	•	чи треба ще маленький “37.5 closure / cleanup”
	•	чи 36 Product Layer вже може спиратися на нову topology

⸻