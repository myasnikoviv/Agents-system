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
- Stage: done
- Owner: PM-Orchestrator
- Evidence: [walkthrough.md](file:///Users/myasnikoviv/.gemini/antigravity/brain/0c67c63c-5582-488c-a381-9d05e61eb5eb/walkthrough.md)
