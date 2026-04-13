# Implement Asset Registry DB schema (AGSYS-3502)

## Scope
•	створити таблицю asset_registry
	•	поля:
	•	asset_id
	•	asset_type
	•	tenant_id
	•	workspace_id
	•	project_id
	•	source_template_id
	•	source_template_version
	•	current_version
	•	storage_ref
	•	status
	•	compatibility_state
	•	approval_state
	•	customization_level
	•	lineage_parent_asset_id

## Acceptance Criteria
•	schema створений і мігрується
	•	CRUD доступний через service layer
	•	registry є source of truth

## Status
- Pipeline: sprint-35
- Stage: backlog
- Owner: TBD
