export type GovernancePhase = 'before_execution' | 'after_execution' | 'before_task_close';

export type GovernanceEvaluationType = 'deterministic' | 'hybrid' | 'llm';
export type GovernanceEnforcementMode = 'hard' | 'soft' | 'advisory';

export interface GovernanceRule {
  id:
    | 'git_preflight'
    | 'postflight_evidence'
    | 'improvement_loop'
    | 'required_agent_usage'
    | 'required_pipeline_usage'
    | 'cost_guard_light';
  triggerPhases: GovernancePhase[];
  evidence: string[];
  evaluationType: GovernanceEvaluationType;
  enforcementMode: GovernanceEnforcementMode;
  enabledByDefault: boolean;
}

export interface GovernanceEngineContext {
  runId: string;
  projectId: string;
  ticketId: string;
  chainId: string;
  workspacePath?: string;
  pipelineId?: string;
  hasMutatingAction?: boolean;
  bypassToken?: string;
}

export interface GovernanceRuleEvaluation {
  ruleId: GovernanceRule['id'];
  verdict: 'pass' | 'fail' | 'unknown';
  reason: string;
  evidenceSummary: string;
}

export interface GovernancePhaseResult {
  phase: GovernancePhase;
  blocked: boolean;
  action: 'allow' | 'block' | 'retry' | 'warn' | 'skip';
  entries: GovernanceRuleEvaluation[];
  retrySuggested: boolean;
}
