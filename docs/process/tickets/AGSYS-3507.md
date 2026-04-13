# Implement impact analysis before asset mutation (AGSYS-3507)

## Scope
•	перевірка перед:
	•	delete
	•	replace
	•	edit
	•	повернення:
	•	affected entities
	•	breaking / non-breaking flag

## Acceptance Criteria
•	система блокує breaking delete
	•	повертається повний impact report

## Status
- Pipeline: sprint-35
- Stage: backlog
- Owner: TBD
