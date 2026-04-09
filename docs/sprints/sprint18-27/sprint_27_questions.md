Супер. Нижче даю жорсткий Validation Pack для Sprint 27 — він перевіряє не “чи з’явився якийсь manager”, а:

❗ чи у вас реально з’явився Control Plane, який керує платформою, а не просто обгортає shell-скрипти.

⸻

🟪 SPRINT 27 — FINAL VALIDATION PACK (Runtime Control Plane & Service Orchestration Layer)

🎯 Ціль перевірки

Підтвердити, що система:
	•	має єдиний Control Plane
	•	знає про всі сервіси через декларативний registry
	•	підтримує desired state → actual state reconciliation
	•	має health checks + restart policy
	•	працює через execution adapters
	•	більше не залежить від ручного shell orchestration як primary model

⸻

🟫 SECTION 1 — Service Registry

1.1 Чи існує декларативний registry сервісів?

Перевірити:
	•	є окремий registry/config для сервісів
	•	registry не захардкожений у core logic
	•	registry містить хоча б:
	•	serviceId
	•	service type
	•	runtime mode / adapter type
	•	desired state
	•	health spec

1.2 Чи registry є source of truth?
	•	Control Plane читає registry
	•	сервіси не “вшиті” руками в код start-up flow
	•	зміна registry реально змінює поведінку orchestration

1.3 Чи registry валідований?
	•	invalid descriptor блокує boot
	•	schema validation існує
	•	помилки зрозумілі

⸻

🟫 SECTION 2 — Control Plane Core

2.1 Чи існує окремий Control Plane Core?

Перевірити:
	•	є окремий модуль/сервіс
	•	він не змішаний з runtime/business logic
	•	він не виконує агентні задачі

2.2 Чи Control Plane бачить всі сервіси?
	•	list services працює
	•	status кожного сервісу доступний
	•	state централізовано зведений

2.3 Чи Control Plane не став новим god-object?
	•	він НЕ знає бізнес-деталі агентів/тасок/policies
	•	він працює на рівні platform services only
	•	responsibilities обмежені orchestration + health + reconciliation

⸻

🟫 SECTION 3 — Desired State Model

3.1 Чи існує desired state per service?
	•	service can be declared as running/stopped
	•	desired state зберігається централізовано
	•	actual state порівнюється з desired state

3.2 Чи desired state реально використовується?

Сценарій:
	•	змінити desired state сервісу

Очікування:
	•	Control Plane реагує
	•	service start/stop відбувається
	•	статус оновлюється

⸻

🟫 SECTION 4 — Reconciliation Loop

4.1 Чи reconciliation loop реально працює?

Перевірити:
	•	loop виконується періодично
	•	mismatch виявляється
	•	corrective action запускається

4.2 Чи loop не є “manual only”?
	•	не потрібно вручну натискати restart
	•	loop сам виявляє drift

4.3 Чи reconciliation deterministic?
	•	немає LLM у control path
	•	рішення про restart/start/stop deterministic

4.4 Чи loop не блокує основну систему?
	•	orchestration не блокує runtime
	•	health checks/reconciliation не ламають execution flow

⸻

🟫 SECTION 5 — Execution Adapters

5.1 Чи існує adapter abstraction?
	•	є unified adapter interface
	•	Control Plane не запускає сервіси напряму shell-командами в core

5.2 Чи є LocalProcessAdapter?
	•	start/stop/restart local process працює
	•	PID / process identity відстежується
	•	stdout/stderr доступні

5.3 Чи є DockerAdapter?
	•	service можна підняти як container
	•	container status читається
	•	restart через adapter працює

5.4 Чи adapters interchangeable?

Сценарій:
	•	один і той самий service descriptor у different runtime profile

Очікування:
	•	local profile → local adapter
	•	docker profile → docker adapter
	•	core code не переписується

⸻

🟫 SECTION 6 — Health Monitoring

6.1 Чи health checks реально існують?
	•	HTTP health endpoints
	•	heartbeat-based checks
	•	timeout-based checks

6.2 Чи визначаються стани?
	•	healthy
	•	degraded
	•	failed
	•	stopped

6.3 Чи health status правдивий?
	•	стан базується на реальних check’ах
	•	не базується лише на “останній відомій події”

6.4 Чи health дані централізовані?
	•	всі сервіси зведені в один status view
	•	можна отримати snapshot платформи

⸻

🟫 SECTION 7 — Restart Policy

7.1 Чи restart policy реально працює?

Сценарій:
	•	сервіс падає

Очікування:
	•	restart запускається автоматично
	•	restart count збільшується
	•	причина зберігається

7.2 Чи є retry limits / backoff?
	•	max retries configurable
	•	є basic backoff
	•	немає infinite restart storm

7.3 Чи crash classification працює?
	•	crash
	•	timeout
	•	degraded
	•	startup failure

Очікування:
	•	policy відрізняється за типом збою або хоча б фіксує reason правильно

⸻

🟫 SECTION 8 — Control API

8.1 Чи є Control API?
	•	list services
	•	get status
	•	start service
	•	stop service
	•	restart service

8.2 Чи API реально впливає на platform state?
	•	start дійсно запускає сервіс
	•	stop реально зупиняє
	•	restart створює новий lifecycle transition

8.3 Чи API auth-aware?
	•	неавторизований user не може керувати сервісами
	•	actor identity логиться

⸻

🟫 SECTION 9 — Gateway / Platform Integration

9.1 Чи Control Plane інтегрований із gateway?
	•	health/status/control доступні через platform entrypoint
	•	routing не дублюється хаотично

9.2 Чи shell scripts більше не primary control path?
	•	scripts можуть бути thin wrappers
	•	але system boot/control можливі без ручної shell orchestration

9.3 Чи platform boot керований?
	•	є контрольований порядок старту
	•	dependencies враховані
	•	“підняти платформу” = відтворюваний процес

⸻

🟫 SECTION 10 — Telemetry & Observability

10.1 Чи service lifecycle events емітяться?
	•	service.started
	•	service.failed
	•	service.restarted
	•	service.degraded
	•	service.stopped

10.2 Чи події містять достатньо контексту?
	•	serviceId
	•	timestamp
	•	reason/error
	•	actor/system source

10.3 Чи можна відтворити історію сервісу?
	•	restart history
	•	failure history
	•	health history

⸻

🟫 SECTION 11 — Failure Scenarios

11.1 Single Service Crash

Сценарій:
	•	убити один сервіс

Очікування:
	•	failure detected
	•	restart policy triggered
	•	service returns or marked failed cleanly
	•	platform не зависає

11.2 Multiple Service Failure

Сценарій:
	•	одночасно впали 2+ сервіси

Очікування:
	•	failures відслідковані окремо
	•	немає cascade collapse control plane
	•	recovery незалежний

11.3 Broken Health Endpoint

Сценарій:
	•	service живий, але health endpoint бреше/недоступний

Очікування:
	•	degraded/failure classification коректна
	•	system не “думає, що все ок”, якщо це не так

11.4 Restart Loop Protection

Сценарій:
	•	сервіс падає одразу після старту

Очікування:
	•	system не заходить у нескінченний цикл
	•	service переходить у failed/degraded with reason

⸻

🟫 SECTION 12 — Local Platform Boot Validation

12.1 Чи платформу можна підняти без ручної магії?
	•	всі сервіси стартують через Control Plane
	•	порядок керований
	•	dependencies respected

12.2 Чи один інженер може “підняти систему з нуля”?
	•	reproducible start
	•	documented config
	•	no hidden tribal knowledge

12.3 Чи local-first сценарій лишився комфортним?
	•	система не стала занадто важкою для локальної розробки
	•	dev workflow не зламаний

⸻

🟫 SECTION 13 — Cloud Readiness Bridge

13.1 Чи Control Plane готує систему до cloud orchestration?
	•	adapters абстрагують execution
	•	registry declarative
	•	desired state / actual state model існує

13.2 Чи можна додати CloudAdapter без redesign core?
	•	abstraction достатня
	•	немає жорсткої прив’язки до local process assumptions

13.3 Чи platform state відокремлений від конкретної машини?
	•	service status / lifecycle / config не зав’язані на один локальний shell session

⸻

🟫 SECTION 14 — Final Reality Check

❗ Питання 1
	•	Чи система тепер сама управляє своїм станом?

❗ Питання 2
	•	Чи Control Plane є реальною платформною сутністю, а не новою обгорткою над скриптами?

❗ Питання 3
	•	Чи зникла залежність від “ручного знання, що і в якому порядку запускати”?

❗ Питання 4
	•	Чи система готова до наступного кроку: cloud adapters / autoscaling / SaaS ops?

❗ Питання 5
	•	Чи немає нового single point of failure без recovery story?

⸻

🧾 REQUIRED OUTPUT FORMAT

Агент має повернути:

## Sprint 27 Validation Report

Overall: READY / PARTIAL / NOT READY

### Service Registry
...

### Control Plane Core
...

### Reconciliation
...

### Execution Adapters
...

### Health & Restart Policy
...

### Control API
...

### Telemetry & Failure Recovery
...

### Local Platform Boot
...

### Critical Gaps
...

### Recommendation
...


⸻

💥 Ключовий критерій Sprint 27

Sprint 27 завершений тільки якщо:
	•	registry декларативний і реальний;
	•	control plane управляє сервісами, а не просто описує їх;
	•	reconciliation loop працює;
	•	health + restart policy реальні;
	•	adapters працюють;
	•	shell scripts більше не є primary orchestration path;
	•	platform можна стабільно підняти і відновити.

⸻

Якщо коротко

❗ після Sprint 27 у вас має бути не “скрипт, який запускає сервіси”,
а платформа, яка знає, які сервіси мають жити, і сама стежить за цим
