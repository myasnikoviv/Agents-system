🟪 Sprint 28 — Architecture Knowledge Base & System Context Layer

⸻

🎯 Goal

Побудувати єдину систему збереження архітектурного контексту, яка:
	•	зберігає всі архітектурні рішення
	•	відображає актуальну структуру системи
	•	дає наочні діаграми (C4)
	•	інтегрується з розробкою
	•	і забезпечує:
	•	розуміння системи людьми
	•	стабільність для LLM/агентів

⸻

🧠 Core Idea

Зараз у вас є:
	•	код
	•	спринти
	•	таски
	•	рішення “в голові” або в чатах

👉 Але немає:

❗ єдиного джерела правди про архітектуру

⸻

❗ Проблема

Без цього шару:
	•	❌ губляться рішення
	•	❌ складно онбордити нових агентів/людей
	•	❌ LLM не має стабільного контексту
	•	❌ архітектура розпадається
	•	❌ неможливо зрозуміти “чому так зроблено”

⸻

🧩 Що вводиться

👉 Architecture Knowledge Base (AKB)

Це не просто документація.

Це:

🧠 жива модель системи + історія рішень + візуалізація

⸻

🏗️ Архітектура рішення

⸻

1. Architecture Model Layer (C4 + DSL)

Опис всієї системи:
	•	Context
	•	Containers
	•	Components

👉 через Structurizr DSL або аналог

⸻

2. Documentation Layer (arc42)

Структурована документація:
	•	building blocks
	•	runtime view
	•	deployment view
	•	constraints
	•	risks

⸻

3. Decision Layer (ADR)

Фіксація всіх важливих рішень:
	•	control plane введений → чому
	•	environment model → чому
	•	externalized state → чому

⸻

4. Linking Layer (ДУЖЕ ВАЖЛИВО)

Зв’язки:
	•	діаграма → код
	•	рішення → компонент
	•	компонент → сервіс
	•	сервіс → runtime

⸻

5. Agent Context Layer

Контекст для агентів:
	•	опис системи
	•	правила
	•	обмеження
	•	архітектурні принципи

⸻

🧱 Scope

⸻

✔️ Входить
	•	architecture DSL (Structurizr або аналог)
	•	C4 diagrams
	•	arc42 documentation structure
	•	ADR система
	•	linking між:
	•	code
	•	architecture
	•	decisions
	•	базовий export/view layer

⸻

❌ НЕ входить
	•	full dev portal (типу Backstage)
	•	fancy UI
	•	автоматична синхронізація всього (тільки частково)
	•	enterprise knowledge graphs

⸻

🧠 Принципи

⸻

1. Docs-as-Code
	•	все в репозиторії
	•	version controlled
	•	PR-driven

⸻

2. Single Source of Truth
	•	архітектура не в чатах
	•	не в голові
	•	не в random файлах

⸻

3. Living Documentation
	•	не “написали і забули”
	•	а оновлюється разом із кодом

⸻

4. Decision Traceability

будь-який важливий шматок системи → має пояснення “чому”

⸻

5. LLM-Readable by Design
	•	структурований формат
	•	мінімум “води”
	•	максимум чітких зв’язків

⸻

🧪 Success Criteria

⸻

✅ Є C4 модель системи
	•	context diagram
	•	container diagram
	•	ключові components

⸻

✅ Є arc42 документація
	•	структура повна
	•	ключові розділи заповнені

⸻

✅ Є ADR система
	•	мінімум 5–10 ключових рішень зафіксовані
	•	всі нові рішення йдуть через ADR

⸻

✅ Є зв’язки
	•	diagram → code
	•	decision → component
	•	service → runtime

⸻

✅ Є agent-readable context
	•	можна передати агенту і він зрозуміє систему

⸻

✅ Документація використовується
	•	не лежить мертво
	•	реально відкривається при розробці

⸻

📊 Expected Outcome

⸻

До:
	•	архітектура в голові
	•	рішення губляться
	•	складно масштабувати систему

⸻

Після:
	•	є жива карта системи
	•	є історія рішень
	•	є структура знань
	•	є стабільний контекст для агентів

⸻

💥 Ключова зміна

⸻

До Sprint 28:

“ми будуємо систему”

⸻

Після Sprint 28:

“ми будуємо систему, яка сама знає, як вона влаштована”

⸻

🧠 Як це вписується
	•	Sprint 25 → архітектура
	•	Sprint 26 → multi-user runtime
	•	Sprint 27 → control plane
	•	Sprint 28 → knowledge layer (дуже критичний)

⸻

🚀 Чому це реально важливо саме зараз

Ти вже:
	•	зайшов у складну систему
	•	маєш багато абстракцій
	•	маєш control plane, governance, runtime

👉 Без цього шару далі буде тільки складніше.

⸻