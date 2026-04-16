import { buildExecutionPlan } from '../compliance/ExecutionPlanBuilder';
import { analyzeTaskForCompliance } from '../compliance/TaskAnalyzer';
import type { PlannerDecision } from '@system/shared';

export interface PlannerInput {
  runId: string;
  projectId: string;
  ticketId: string;
  message: string;
  requestedPipeline?: string;
  requestedAgents?: string[];
  requestedSkills?: string[];
}

export function buildPlannerDecision(input: PlannerInput): PlannerDecision {
  const analyzed = analyzeTaskForCompliance({
    runId: input.runId,
    projectId: input.projectId,
    ticketId: input.ticketId,
    message: input.message,
    requestedPipeline: input.requestedPipeline,
    requestedAgents: input.requestedAgents,
    requestedSkills: input.requestedSkills,
  });
  const plan = buildExecutionPlan(analyzed);
  const optimizedSkills = optimizeSkillSelection({
    message: input.message,
    pipeline: plan.pipeline,
    baseSkills: plan.skills,
    requestedSkills: input.requestedSkills || [],
  });

  return {
    pipeline: plan.pipeline,
    agents: plan.agents,
    skills: optimizedSkills,
    stages: plan.stages,
    confidence: plan.stages.length >= 3 ? 'high' : 'medium',
    source: 'deterministic-planner',
    reason: 'Planner decision derived from compliance analyzer + execution plan builder, with runtime skill optimization.',
  };
}

function optimizeSkillSelection(input: {
  message: string;
  pipeline: string;
  baseSkills: string[];
  requestedSkills: string[];
}): string[] {
  if (input.requestedSkills.length > 0) {
    return Array.from(new Set(input.requestedSkills.map((x) => String(x || '').trim()).filter(Boolean)));
  }
  const msg = String(input.message || '').toLowerCase();
  const base = Array.from(new Set(input.baseSkills.map((x) => String(x || '').trim()).filter(Boolean)));
  const picks = new Set<string>();

  if (/(test|coverage|ci|assert|regression|qa)/i.test(msg)) {
    for (const skill of base) {
      if (skill.includes('test')) picks.add(skill);
    }
  }
  if (/(refactor|cleanup|legacy|tech debt)/i.test(msg)) {
    picks.add('engineering/refactor');
    picks.add('engineering/repo-navigation');
  }
  if (/(docs|documentation|readme|spec)/i.test(msg)) {
    picks.add('engineering/documentation-update');
  }
  if (/(runtime|redis|queue|worker|timeout|stuck|event)/i.test(msg)) {
    picks.add('runtime/runtime-inspection');
  }

  if (picks.size === 0) {
    return base.slice(0, 2);
  }

  for (const skill of base) picks.add(skill);
  return Array.from(picks).slice(0, 4);
}
