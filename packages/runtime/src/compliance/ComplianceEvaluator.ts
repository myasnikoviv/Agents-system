import { ComplianceActualEvidence, ComplianceEvaluationResult, CompliancePlan, ComplianceRuleResult } from './ComplianceTypes';

function subset(required: string[], actual: string[]): { ok: boolean; missing: string[] } {
  const actualSet = new Set(actual);
  const missing = required.filter((item) => !actualSet.has(item));
  return { ok: missing.length === 0, missing };
}

export function evaluateCompliance(plan: CompliancePlan, actual: ComplianceActualEvidence): ComplianceEvaluationResult {
  const results: ComplianceRuleResult[] = [];

  const planRequiredOk = Boolean(plan.pipeline && plan.agents.length > 0 && plan.skills.length > 0 && plan.stages.length > 0);
  results.push({
    ruleId: 'plan_required',
    verdict: planRequiredOk ? 'pass' : 'fail',
    reason: planRequiredOk ? 'plan_present' : 'plan_missing_or_incomplete',
    detail: `pipeline=${plan.pipeline},agents=${plan.agents.length},skills=${plan.skills.length},stages=${plan.stages.length}`,
  });

  const agentCheck = subset(plan.agents, actual.agents);
  results.push({
    ruleId: 'required_agent_compliance',
    verdict: agentCheck.ok ? 'pass' : 'fail',
    reason: agentCheck.ok ? 'required_agents_present' : 'required_agents_missing',
    detail: agentCheck.ok ? 'all_required_agents_seen' : `missing=${agentCheck.missing.join(',')}`,
  });

  const pipelineCheck = subset([plan.pipeline], actual.pipelines);
  const stageCheck = subset(plan.stages, actual.stages);
  results.push({
    ruleId: 'required_pipeline_compliance',
    verdict: pipelineCheck.ok && stageCheck.ok ? 'pass' : 'fail',
    reason: pipelineCheck.ok && stageCheck.ok ? 'required_pipeline_and_stages_present' : 'pipeline_or_stage_missing',
    detail: `missing_pipeline=${pipelineCheck.missing.join(',') || 'none'};missing_stages=${stageCheck.missing.join(',') || 'none'}`,
  });

  const skillCheck = subset(plan.skills, actual.skills);
  results.push({
    ruleId: 'required_skill_compliance',
    verdict: skillCheck.ok ? 'pass' : 'fail',
    reason: skillCheck.ok ? 'required_skills_present' : 'required_skills_missing',
    detail: skillCheck.ok ? 'all_required_skills_seen' : `missing=${skillCheck.missing.join(',')}`,
  });

  return {
    runId: plan.runId,
    plan,
    actual,
    results,
    passed: results.every((r) => r.verdict === 'pass'),
  };
}
