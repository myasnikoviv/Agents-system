# TKT-72/73 Runtime Execution Contract v1

Date: 2026-03-19
Owners: Solution Architect -> Developer -> QA
Related: TRADE-72, TRADE-73

## 1. Scope
Define implementation contract for:
1. Role MCP tool-loop orchestration (TRADE-72)
2. Pipeline state persistence and resume continuity (TRADE-73)

## 2. Runtime Contract
### 2.1 Role Tool-Loop
Each role node executes under the same bounded loop contract:
- Inputs: `pipeline`, `stage`, `ticket`, `thread_id`, `allowed_tools`, `guardrails`
- Steps:
1. Build role context envelope from pipeline state
2. Plan tool actions (0..N)
3. Execute allowed MCP tools
4. Validate action result against stage acceptance
5. Emit artifact + next action
- Guardrails:
- No tool call outside `allowed_tools`
- No mutation before git preflight gate
- No handoff without evidence artifact

### 2.2 Pipeline State Continuity
State must be stored in 3 synchronized places:
1. LangGraph checkpoint thread state
2. PM pipeline state card (`docs/process/pm/pipeline-state/<ticket>.md`)
3. Plane issue comment summary (stage + next owner)

Resume rule:
- On continue/resume, runtime restores state from checkpoint; if mismatch with state card, enters `blocked` stage until PM reconciliation.

## 3. Data Structures (minimum)
```ts
interface PipelineRunState {
  pipelineId: string;
  stage: string;
  completedStages: string[];
  ticketId: string;
  threadId: string;
  currentOwner: string;
  nextOwner: string;
  blockingGates: string[];
  evidence: string[];
}

interface RoleLoopResult {
  stage: string;
  status: 'success' | 'blocked' | 'failed';
  evidenceArtifact: string;
  nextAction: string;
  nextOwner: string;
}
```

## 4. Stage Acceptance Contract
A stage is complete only if all are true:
1. `status=success`
2. evidence artifact written
3. Plane comment posted
4. state card updated
5. next owner assigned

## 5. Failure Contract
- `blocked`: governance mismatch (state card mismatch, missing preflight, missing required artifact)
- `failed`: technical failure (tool error, transport, runtime exception)
- Both must emit structured reason codes for Cockpit ledger.

## 6. Implementation Deliverables
1. Runtime interfaces + orchestrator middleware
2. Role tool-loop adapter layer
3. State synchronization service (checkpoint/card/Plane)
4. Resume guard and mismatch blocker
5. Tests:
- unit: loop guardrails
- integration: stage completion contract
- e2e: resume continuity after interrupt

## 7. QA Gate
Must-pass checks:
1. unauthorized tool call rejected
2. no-handoff-without-evidence enforced
3. resume restores exact stage/owner
4. mismatch transitions to blocked with explicit remediation

## 8. Out of Scope (for this slice)
- Full autonomous merge-to-main execution
- UI redesign of Cockpit
- Non-PM role policy redesign
