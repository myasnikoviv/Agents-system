import { CompliancePlan } from './ComplianceTypes';

function inferPipeline(message: string, requestedPipeline?: string): string {
  const explicit = String(requestedPipeline || '').trim();
  if (explicit && explicit !== 'unified-task-intake') return explicit;

  const text = message.toLowerCase();
  if (/\b(bug|fix|error|регрес|помилка|виправ)\b/.test(text)) return 'bug-fix';
  if (/\b(refactor|cleanup|legacy|рефактор)\b/.test(text)) return 'refactor';
  if (/\b(feature|implement|add|фіча|реаліз)\b/.test(text)) return 'new-feature';
  return explicit || 'unified-task-intake';
}

function defaultAgentsForPipeline(pipeline: string): string[] {
  if (pipeline === 'bug-fix') return ['pm-orchestrator', 'developer', 'tdd-qa'];
  if (pipeline === 'new-feature') return ['pm-orchestrator', 'solution-architect', 'developer', 'code-reviewer'];
  if (pipeline === 'refactor') return ['pm-orchestrator', 'solution-architect', 'developer'];
  return ['pm-orchestrator', 'developer'];
}

function defaultSkillsForPipeline(pipeline: string): string[] {
  if (pipeline === 'bug-fix') return ['engineering/test-fixing', 'engineering/test-generation'];
  if (pipeline === 'new-feature') return ['engineering/repo-navigation', 'engineering/test-generation'];
  if (pipeline === 'refactor') return ['engineering/refactor', 'engineering/repo-navigation'];
  return ['engineering/repo-navigation'];
}

export function analyzeTaskForCompliance(input: {
  runId: string;
  projectId: string;
  ticketId: string;
  message: string;
  requestedPipeline?: string;
  requestedAgents?: string[];
  requestedSkills?: string[];
}): CompliancePlan {
  const pipeline = inferPipeline(input.message, input.requestedPipeline);
  const agents = (input.requestedAgents && input.requestedAgents.length > 0)
    ? input.requestedAgents
    : defaultAgentsForPipeline(pipeline);
  const skills = (input.requestedSkills && input.requestedSkills.length > 0)
    ? input.requestedSkills
    : defaultSkillsForPipeline(pipeline);

  return {
    runId: input.runId,
    projectId: input.projectId,
    ticketId: input.ticketId,
    pipeline,
    agents: Array.from(new Set(agents.filter(Boolean))),
    skills: Array.from(new Set(skills.filter(Boolean))),
    stages: [],
    source: 'task-analyzer',
  };
}
