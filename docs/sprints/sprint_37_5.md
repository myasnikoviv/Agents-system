🧩 Sprint 37.5 — Topology Cleanup & Architectural Closure [COMPLETED]

1. Контекст

Sprint 37 зробив правильну річ:
	•	розбив моноліт на apps/*
	•	виділив client-app, control-plane, runtime-engine
	•	ввів domain packages

Але результат зараз — це:

“архітектурно правильно, але операційно шумно і місцями не доведено до кінця”

Основні проблеми:
	•	засмічений root
	•	неочевидна структура для нового розробника
	•	нечітка модель БД (ownership є, фізичної структури — ні)
	•	naming конфлікти (plane)
	•	runtime/build артефакти змішані з source

⸻

2. Ціль спринта

👉 Зробити repository production-grade readable і завершити decomposition

Не змінюємо архітектуру.
Не додаємо нові фічі.

Ми:

доводимо Sprint 37 до стану, де його можна назвати “закритим”.

⸻

3. Definition of Done (важливо)

Спринт вважається завершеним, якщо:
	•	новий dev за 5 хвилин розуміє:
	•	де frontend
	•	де API/control
	•	де runtime
	•	де конфіги
	•	де БД
	•	root repo:
	•	не містить випадкових файлів
	•	не містить runtime/log артефактів
	•	БД:
	•	має чітку модель (навіть якщо одна БД)
	•	міграції структуровані логічно
	•	naming:
	•	не конфліктує з бізнес-термінами (Plane, MCP і т.д.)

⸻

4. Scope (що ВХОДИТЬ)

4.1 Root Cleanup

Проблема

Зараз root виглядає як:
	•	суміш infra, dev-скриптів, логів і конфігів

Що робимо

Вводимо чітку структуру:

/apps
/packages
/config
/infra
/docs
/scripts

Дії

Перенести:
	•	docker-compose.runtime.yml → /infra/compose/
	•	debug_infra.ts → /scripts/debug/
	•	cockpit_config.json → /config/local/ або /config/dev/

Видалити або gitignore:
	•	всі *.log у root
	•	тимчасові runtime файли

⸻

4.2 Apps Hygiene

Проблема

У apps/* лежить:
	•	node_modules
	•	dist
	•	.tsbuildinfo
	•	логи

Це засмічує структуру і створює фейкове відчуття складності.

Що робимо
	•	переконатися, що:
	•	node_modules — не трекаються
	•	dist — не трекається
	•	build outputs — у .gitignore
	•	якщо треба:
	•	централізувати build output у /build/ або /dist/

⸻

4.3 Naming Fix (критично важливо)

Проблема

control-plane і runtime-engine:
	•	конфліктують з Plane (ticket system)
	•	незрозумілі бізнес-користувачу

Що робимо

Рефактор naming:

Було	Стає
control-plane	platform-api або control-api
runtime-engine	runtime-engine або runtime-service

👉 Важливо: не міняти логіку, тільки назви + імпорти

⸻

4.4 Database Topology Closure

Проблема

Зараз:
	•	є db/migrations/0001_cockpit_postgres_init.sql
	•	немає явної структури по доменах

Що потрібно вирішити (обов’язково)

👉 Обрати модель:

Варіант A (простий і нормальний зараз)
	•	одна БД
	•	кілька schema:
	•	runtime
	•	control
	•	billing
	•	governance

Варіант B (майбутній)
	•	окремі БД per service

У цьому спринті:

👉 Реалізуємо мінімум:
	•	рознести міграції:

/db
  /runtime
  /control
  /billing

	•	або:
	•	залишити одну папку, але:
	•	чітко документувати ownership
	•	перейменувати:
	•	0001_cockpit_postgres_init.sql
→
	•	щось типу 0001_platform_init.sql або 0001_control_schema.sql

⸻

4.5 Config Layer Normalization

Проблема

Конфіги зараз розкидані:
	•	root
	•	apps
	•	env файли
	•	docs

Що робимо

Стандартизуємо:

/config
  /runtime
  /control
  /env

І правило:

❗ жоден critical config не лежить у root

⸻

4.6 Docs Alignment (важливо)

Проблема

Docs хороші, але не відповідають новій topology повністю.

Що робимо

Оновити:
	•	infra-map.md
	•	System_Boundaries_v2.md

Додати:
	•	Repository Structure Guide.md

З поясненням:
	•	що таке apps
	•	що таке packages
	•	як вони взаємодіють

⸻

4.7 Remove Illusions / Dead Artifacts

Проблема

Після рефактору лишаються:
	•	старі файли
	•	дублікати
	•	незрозумілі речі

Що робимо
	•	пройтись по root і apps
	•	видалити:
	•	orphan scripts
	•	старі entry points
	•	дублікати config

⸻

5. Scope (що НЕ входить)

❌ НЕ робимо:
	•	нові сервіси
	•	нові API
	•	self-improvement
	•	product layer
	•	складні міграції БД

⸻

6. Ризики
	•	випадково зламати imports при rename
	•	порушити docker build контексти
	•	загубити dev-конфіги

👉 Тому:
	•	робити поетапно
	•	після кожного кроку — build + run

⸻

7. Очікуваний результат

Після спринта:

Було
	•	“воно працює, але виглядає як messy R&D repo”

Стає
	•	“це виглядає як платформа, яку можна масштабувати”

⸻

8. Чому це важливо (по факту)

Без цього:
	•	36 (Product Layer) буде накладатися на хаос
	•	onboarding dev’ів буде болючий
	•	масштабування = повільне

З цим:
	•	ти отримуєш чисту базу під продукт

⸻

Дуже влучне зауваження — і це якраз той тип речей, які часто ламають архітектуру тихо, якщо їх не формалізувати.

Ти зараз описуєш дві сутності:
	•	agents.md → джерело інструкцій / декларативний опис
	•	Generated/ → згенерований runtime-артефакт

І якщо це не зафіксувати — через 2–3 спринти це перетвориться в:

“ми не знаємо, що є source of truth”

⸻

🧠 Що тут важливо зрозуміти

Це не просто файли.

Це:

частина declarative execution layer твоєї системи

І вона повинна підкорятись тим самим правилам, що й:
	•	runtime
	•	packages
	•	configs
	•	DB

⸻

⚠️ Потенційні проблеми (якщо нічого не зробити)
	1.	Generated стає source of truth
→ люди починають редагувати його руками
	2.	agents.md відстає
→ система працює не так, як описано
	3.	Generated лежить у repo як сміття
→ засмічує структуру
	4.	незрозуміло:

	•	це build artifact?
	•	це runtime state?
	•	це конфіг?

⸻

✅ Що потрібно додати в Sprint 37.5

Я б додав окремий підрозділ:

⸻
Ага, тепер зрозумів правильно — і це важливий нюанс.

👉 У тебе це не “build artifact” у класичному сенсі
👉 Це частина declarative runtime, просто:
	•	генерується з іншого repo
	•	але є вхідною точкою для execution

Тобто:

Generated/ у тебе — це імпортований runtime layer, а не тимчасовий кеш

І це повністю змінює рішення.


🔹 4.8 Generated Agent Layer (External Source Integration)

🎯 Ціль

Зафіксувати, що:

generated/ — це підконтрольна, але зовнішньо-генерована частина системи, яка є частиною runtime execution layer

⸻

🧱 1. Статус Generated

Фіксуємо:

Сутність	Роль
AGENTS.md	декларативна інструкція
external templates repo	source templates
generated/	✅ runtime-ready declarative layer


⸻

👉 Важливо:

generated/ ≠ кеш
generated/ ≠ build output
generated/ = execution input

⸻

🧱 2. Governance правило (критично)

Фіксуємо:

❗ Generated НЕ редагується вручну

Але:

✅ він зберігається в repo як частина системи

⸻

🧱 3. Dependency контракт

Фіксуємо:
	•	система очікує:
	•	що Generated/ існує
	•	що структура стабільна
	•	що агенти посилаються на неї

👉 Це означає:

Generated — це частина runtime contract, не просто файли

⸻

🧱 4. Чому НЕ переносимо (важливе пояснення)

Не робимо:

❌ /build/generated
❌ /runtime/tmp
❌ .gitignore

Бо:
	•	це зламає лінки в agent-файлах
	•	це зламає declarative модель
	•	це зламає reproducibility середовища

⸻

🧱 5. Що ДОБАВИТИ (а не міняти)

Ось тут ключ:

✅ Додати декларацію в архітектуру:

generated/
  = external-generated agent layer
  = versioned
  = part of runtime execution context


⸻
