# Skill Schema v2

Canonical runtime skill schema now lives in:
- `docs/process/skills/INTERNAL-SKILL-SCHEMA.md`

## Canonical Locations
- **Persona Skills**: `docs/skills/*.md`
- **Trading Skills**: `docs/skills/trading/*/SKILL.md`
- **Engineering Skills**: `docs/skills/engineering/*/SKILL.md`

## Lifecycle States
- `draft`
- `Review`
- `approved`
- `deprecated`

## Mandatory Sections
1. `name`
2. `description`
3. `when_to_use`
4. `when_not_to_use`
5. `inputs`
6. `outputs`
7. `required_tools`
8. `workflow`
9. `validation_checklist`
10. `common_failures`
11. `examples`
12. `related_skills`
13. `project_specific_notes`

## Metadata Block
```yaml
id: SKILL-XXX
version: 1
status: draft|review|approved|deprecated
owner_roles: [Role1, Role2]
category: engineering|runtime|trading
adoption: adopt|adapt|custom
source_references:
  - <repo or internal source>
updated_at: YYYY-MM-DD
```

## Governance Rules
- Major updates require proposal artifact in `docs/process/skills/`.
- Imported skills must be normalized before use.
- Skill quality is reviewed in retrospective-learning pipeline.
