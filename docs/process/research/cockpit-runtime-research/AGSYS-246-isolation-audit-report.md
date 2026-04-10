# AGSYS-246 — Isolation Audit Report (projects/chains/agents)

Date: 2026-03-28  
Scope: Research only (no implementation)

## 1) Isolation model observed in code

### Project/chain/message storage isolation (backend)
- Backend keeps separate maps:
  - `projectStore` (project-level)
  - `threadStore` keyed by `projectId`
  - `threadMessageStore` keyed by `threadId`
- Evidence:
  - declarations: `src/server/agentSystemBackend.ts:33-42`
  - persist/restore: `src/server/agentSystemBackend.ts:289-374`
  - thread insertion per project: `src/server/agentSystemBackend.ts:742-759`
  - delete chain/project behavior: `src/server/agentSystemBackend.ts:1037-1079`

### API-level isolation boundaries
- `/api/chat` receives both `projectId` and `threadId` and records user/agent message under that thread.
- Evidence: `src/server/agentSystemBackend.ts:1279-1343`

### UI state isolation boundaries
- Frontend holds `selectedProject`, `selectedThread`, and message collections keyed by thread.
- Evidence: `frontend/src/components/cockpit/CockpitPage.tsx:240-243`, `335-351`, `724-744`, `799-878`

## 2) Confirmed strengths
1. Project-to-thread partition exists by design (`threadStore` map keyed by project).
2. Thread message history is physically separated by `threadId`.
3. Deleting project removes its threads and message history in backend stores.

## 3) Isolation risk inventory (research findings)
1. Global runtime registries are process-wide:
- Agent/Pipeline/Skill registries are global static stores (`AgentRegistry`, `PipelineRegistry`, `SkillRegistry`) and discovery clears/rebuilds globally.
- Evidence:
  - static maps: `src/runtime/registries/AgentRegistry.ts:17-34`, `src/runtime/registries/PipelineRegistry.ts:23-63`
  - global discovery + clear/register: `src/runtime/DynamicDiscoveryService.ts:15-38`, `40-42`, `80-82`, `118-119`, `152-153`, `181-182`, `208-209`
- Risk: in a multi-project backend process, discovery for one root can replace runtime catalog for all active threads.

2. Event stream is global:
- Runtime events are emitted to one Redis stream `events:runtime_hub`.
- Evidence: `src/runtime/events/EventBus.ts:23-44`
- Risk: consumers must rely on filtering by thread/run metadata; stream itself is shared.

3. Context assembly default defaults may blur boundaries:
- RunContext defaults (`threadId: 'default-thread'`, `projectId` default) if explicit memory/context is missing.
- Evidence: `src/runtime/context/RunContext.ts:143-146`
- Risk: malformed/missing identifiers can route execution into shared defaults.

## 4) Initial test cases for isolation verification
1. Cross-project same thread label:
- Create same-named thread in two projects.
- Verify message fetch endpoint returns only matching `threadId` data.

2. Project deletion containment:
- Delete project A.
- Confirm project B threads/messages remain unchanged.

3. Global discovery drift check:
- Trigger discovery from project A root, then project B root.
- Confirm agent registry used by subsequent run in A still matches A manifest expectations.

4. Shared stream filtering:
- Run two concurrent threads; ensure UI only binds events for active thread.

## 5) Confirmed vs assumed

Confirmed
- Project/thread/message maps are partitioned in backend data model.
- Global static registries and global event stream exist.

Assumed (to verify experimentally)
- Extent of practical leakage through global registry refresh in active multi-project usage.

## 6) Stop condition
Research artifact only. No isolation refactor implemented.
