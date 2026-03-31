# Assumptions Review: PM-S5-3 & PM-S5-4

## Assumptions
1. **Parser Execution Scope**: Since events are generated and rendered in `ReactMarkdown`, the best place to inject the interactive components is through custom remark plugins or custom components bound into `react-markdown`.
2. **Interactive Handlers**: "Click" interactions will, for now, show up as an alert or a predefined global UI popup if no system file opening protocol exists in the backend yet, satisfying "відкриває файл / тікет" on the UI side.
3. **Artifact formatting**: We will parse:
   - `[PM-xxx]` or `PM-xxx` as tickets
   - `src/...` or `/Users/...` or `<filename>.<ext>` as files
   - backtick blocks with commands.

## Design
- `frontend/src/components/cockpit/ArtifactRenderer.tsx` - a wrap for ReactMarkdown or specific parser components.
- Custom Link / Code Block handling inside `CockpitPage` and `StreamRenderer`.

## Sign-off
Owner status: Approved (auto)
