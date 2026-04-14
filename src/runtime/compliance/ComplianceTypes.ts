export type ComplianceRuleId =
  | 'plan_required'
  | 'required_agent_compliance'
  | 'required_pipeline_compliance'
  | 'required_skill_compliance';

export interface CompliancePlan {
  runId: string;
  projectId: string;
  ticketId: string;
  pipeline: string;
  agents: string[];
  skills: string[];
  stages: string[];
  source: 'task-analyzer' | 'explicit' | 'deterministic-planner';
}

export interface ComplianceActualEvidence {
  pipelines: string[];
  agents: string[];
  skills: string[];
  stages: string[];
}

export interface ComplianceRuleResult {
  ruleId: ComplianceRuleId;
  verdict: 'pass' | 'fail';
  reason: string;
  detail: string;
}

export interface ComplianceEvaluationResult {
  runId: string;
  plan: CompliancePlan;
  actual: ComplianceActualEvidence;
  results: ComplianceRuleResult[];
  passed: boolean;
}
