# Assumptions Review: PM-S5-1

## 1. Ticket Information
- **Ticket ID**: PM-S5-1
- **Title**: Event Stream Renderer (UX Parity / Codex-level)
- **Pipeline**: new-feature
- **Stage**: assumptions-review

## 2. Evidence-Backed Assumptions
### Assumption 1: Event Transport Exists
**Evidence**: Existing `EventStore.ts`, `EventBus.ts` inside `src/runtime/events/` implement pub/sub mechanics for backend events. 
**Impact**: We assume the frontend already receives (or can easily connect to) an SSE or WebSocket stream of these JSON events, meaning no major backend re-architecture is required.

### Assumption 2: Frontend Extensibility 
**Evidence**: `frontend/src/components/cockpit/CockpitPage.tsx` currently loops over static messages. 
**Impact**: We assume we can safely refactor the message rendering loop to handle a union type of `Message | ExecutionEvent` without breaking existing manual mode chat features.

### Assumption 3: Progressive Append Structure
**Evidence**: Codex & Cursor UIs treat `thought`, `tool_call`, and `handoff` as collapsible non-terminating elements of the same conversation block.
**Impact**: We assume the design will insert these elements sequentially alongside user/assistant messages as distinct visual "blocks", grouped by `runId`.

## 3. Anticipated Risks & Mitigations
- **Risk**: Stream flickering or duplicate events in React state.
  - **Mitigation**: Introduce a robust `useExecutionStream` hook that buffers and deduplicates events based on `eventId` or precise sequence counters.
- **Risk**: Unhandled custom events crashing the renderer.
  - **Mitigation**: Implement a fallback `UnknownEventRenderer` or silently drop unknown types.
- **Risk**: Overwhelming the DOM with thousands of micro-thoughts.
  - **Mitigation**: Group/collapse sequential `system.thought` events inside a single UI node.

## 4. Architectural Target
Provide a `StreamRenderer.tsx` and integrate it into `CockpitPage.tsx`. Map standard event namespaces (`system.thought`, `tool.call`) to specialized React functional components.

---
**Status**: DRAFT (Awaiting Owner Review & Corrections)
