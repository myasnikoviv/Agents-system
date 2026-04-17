# Assumptions Review: AGSYS-355C-REMEDIATION

## Assumptions
1. Kubernetes є цільовою production orchestration платформою; non-k8s варіанти допускаються лише як проміжний compatibility layer.
2. Runtime/control service boundaries вже достатньо стабільні для поступового переносу в orchestrated deployment.
3. Legacy SQLite code може лишатися тільки в історичних docs/tests до їх окремої міграції, але не в active runtime/control contracts.
4. Reproducible evidence має бути отриманий через локальний/CI automation, без ручних "разових" підтверджень.

## Risks
- Частина legacy модулів може мати неочевидні runtime-залежності на SQLite.
- Перехід до orchestrated runtime може виявити прогалини в readiness contracts і service startup ordering.
- Центральна observability може потребувати додаткового ресурсного бюджету та retention-policy tuning.

## Mitigation
- Ввести phased cutover з contract tests між сервісами.
- Використати fail-fast readiness + dependency checks для startup gates.
- Додати smoke + chaos-lite сценарії для restart/logging/alert pipelines.

## Approval Traceability
- Approver: User (Owner)
- Status: APPROVED
- Timestamp: 2026-04-17
