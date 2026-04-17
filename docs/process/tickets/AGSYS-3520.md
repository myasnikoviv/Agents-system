# Collect runtime signals for improvement detection (AGSYS-3520)

## Scope
•	loop triggers
	•	retries
	•	failures
	•	token usage
	•	latency
	•	routing decisions

## Acceptance Criteria
•	всі сигнали логуються структуровано
	•	доступні для analysis layer

## Status
- Pipeline: sprint-35
- Stage: done
- Owner: PM-Orchestrator
- Progress: Implemented SignalCollector and integrated with GovernanceLogger.
