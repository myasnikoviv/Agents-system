export type SkillId =
  | 'repo-navigation'
  | 'refactor'
  | 'test-generation'
  | 'test-fixing'
  | 'architecture-review'
  | 'documentation-update'
  | 'pipeline-selection'
  | 'research-before-implementation'
  | 'retrospective'
  | 'knowledge-update'
  | 'skill-gap-detection'
  | 'runtime-inspection'
  | 'market-structure-research'
  | 'wave-logic-formalization'
  | 'domain-ambiguity-detection'
  | 'strategy-validation'
  | 'backtest-result-analysis';

export interface RoleSkillRule {
  skillId: SkillId;
  useWhen: string;
  avoidWhen: string;
  keywords: string[];
}

const sharedEngineering: RoleSkillRule[] = [
  {
    skillId: 'repo-navigation',
    useWhen: 'Starting any non-trivial investigation or code change.',
    avoidWhen: 'Task is already scoped to a single known file and symbol.',
    keywords: ['where', 'find', 'module', 'entrypoint', 'scope', 'impact', 'files'],
  },
  {
    skillId: 'test-generation',
    useWhen: 'Logic/contract behavior was added or changed.',
    avoidWhen: 'Pure copy or formatting-only docs edits.',
    keywords: ['test', 'coverage', 'edge case', 'regression', 'assert'],
  },
  {
    skillId: 'test-fixing',
    useWhen: 'There are failing or flaky tests.',
    avoidWhen: 'No failing tests and no behavior changes.',
    keywords: ['fail', 'failing', 'flaky', 'broken test', 'ci red'],
  },
];

export const ROLE_SKILL_RULES: Record<string, RoleSkillRule[]> = {
  'pm-orchestrator': [
    {
      skillId: 'repo-navigation',
      useWhen: 'The user asks for codebase summary, file contents, project structure, or finding specific information in the repo.',
      avoidWhen: 'Simple conversational questions that do not require project context.',
      keywords: ['file', 'codebase', 'structure', 'summarize', 'search', 'context'],
    },
    {
      skillId: 'pipeline-selection',
      useWhen: 'Always, for every incoming user request at entrypoint.',
      avoidWhen: 'Only when already inside an approved continuation step of the same run.',
      keywords: ['pipeline', 'entrypoint', 'route', 'intake', 'workflow'],
    },
    {
      skillId: 'research-before-implementation',
      useWhen: 'Task is medium/high complexity or cross-module.',
      avoidWhen: 'Small isolated patch with clear root cause.',
      keywords: ['plan', 'approach', 'design', 'options', 'before implement'],
    },
    {
      skillId: 'architecture-review',
      useWhen: 'Decision may affect runtime boundaries or dependencies.',
      avoidWhen: 'No architectural impact expected.',
      keywords: ['architecture', 'boundary', 'coupling', 'layer'],
    },
    {
      skillId: 'retrospective',
      useWhen: 'Task/incident/release is closing.',
      avoidWhen: 'Execution has not reached outcome yet.',
      keywords: ['retro', 'postmortem', 'lesson', 'reflect'],
    },
    {
      skillId: 'knowledge-update',
      useWhen: 'Accepted decision or lesson should be persisted.',
      avoidWhen: 'No verified evidence yet.',
      keywords: ['knowledge', 'decision log', 'kb', 'record'],
    },
    {
      skillId: 'skill-gap-detection',
      useWhen: 'Same failure pattern repeats across tasks.',
      avoidWhen: 'One-off issue without recurrence evidence.',
      keywords: ['gap', 'missing skill', 'recurring failure', 'pattern'],
    },
  ],
  'research-agent': [
    {
      skillId: 'research-before-implementation',
      useWhen: 'Need structured options and constraints.',
      avoidWhen: 'Implementation details are already fully settled.',
      keywords: ['research', 'options', 'constraints', 'analysis'],
    },
    {
      skillId: 'market-structure-research',
      useWhen: 'Question targets market structure/swing/extrema semantics.',
      avoidWhen: 'Task is purely engineering infrastructure.',
      keywords: ['market structure', 'swing', 'extrema', 'trend', 'retrace'],
    },
    {
      skillId: 'domain-ambiguity-detection',
      useWhen: 'Requirement language is vague or contradictory.',
      avoidWhen: 'Formal invariant spec already exists and is accepted.',
      keywords: ['ambiguous', 'unclear', 'assumption', 'undefined'],
    },
    {
      skillId: 'wave-logic-formalization',
      useWhen: 'Need to formalize wave intuition into rules.',
      avoidWhen: 'No wave-related semantics involved.',
      keywords: ['wave', 'leg', 'retrace', 'formalize', 'invariant'],
    },
  ],
  'trader-analyst': [
    {
      skillId: 'market-structure-research',
      useWhen: 'Evaluating setup behavior across market regimes.',
      avoidWhen: 'Task does not involve trading-domain logic.',
      keywords: ['market', 'trend', 'structure', 'regime'],
    },
    {
      skillId: 'wave-logic-formalization',
      useWhen: 'Converting discretionary wave logic to deterministic rules.',
      avoidWhen: 'No wave semantics in scope.',
      keywords: ['wave', 'retrace', 'invariant', 'formal'],
    },
    {
      skillId: 'domain-ambiguity-detection',
      useWhen: 'Domain statement may hide assumptions.',
      avoidWhen: 'Task has explicit numeric definitions.',
      keywords: ['ambiguous', 'assumption', 'unclear'],
    },
    {
      skillId: 'strategy-validation',
      useWhen: 'Need pass/fail decision on strategy correctness.',
      avoidWhen: 'No strategy behavior change occurred.',
      keywords: ['validate', 'strategy', 'contract', 'invariant'],
    },
    {
      skillId: 'backtest-result-analysis',
      useWhen: 'Need causal review of backtest outcomes.',
      avoidWhen: 'No run/report evidence available.',
      keywords: ['backtest', 'pnl', 'drawdown', 'false positive', 'trade-level'],
    },
  ],
  'solution-architect': [
    ...sharedEngineering,
    {
      skillId: 'architecture-review',
      useWhen: 'Design or dependency direction changes are proposed.',
      avoidWhen: 'No structural impact.',
      keywords: ['architecture', 'design', 'boundary', 'dependency'],
    },
    {
      skillId: 'research-before-implementation',
      useWhen: 'Need option analysis before committing design.',
      avoidWhen: 'Low-risk patch only.',
      keywords: ['options', 'tradeoff', 'plan'],
    },
    {
      skillId: 'runtime-inspection',
      useWhen: 'Runtime behavior/state flow is part of the issue.',
      avoidWhen: 'Pure static compile-time concern.',
      keywords: ['redis', 'langgraph', 'runtime', 'event', 'state transition'],
    },
  ],
  developer: [
    ...sharedEngineering,
    {
      skillId: 'refactor',
      useWhen: 'Need safe structural rework without behavior change.',
      avoidWhen: 'Feature redesign is required.',
      keywords: ['refactor', 'cleanup', 'extract', 'restructure'],
    },
    {
      skillId: 'documentation-update',
      useWhen: 'Accepted code changes require docs sync.',
      avoidWhen: 'No docs affected.',
      keywords: ['docs', 'documentation', 'update readme', 'contract notes'],
    },
    {
      skillId: 'runtime-inspection',
      useWhen: 'Debugging runtime anomalies tied to state/events.',
      avoidWhen: 'No runtime symptom or telemetry evidence.',
      keywords: ['runtime', 'stuck', 'redis', 'graph', 'event'],
    },
  ],
  'code-reviewer': [
    ...sharedEngineering,
    {
      skillId: 'architecture-review',
      useWhen: 'Assessing layer/coupling risk in proposed changes.',
      avoidWhen: 'Trivial isolated non-architectural change.',
      keywords: ['architecture', 'layer', 'coupling', 'violation'],
    },
    {
      skillId: 'retrospective',
      useWhen: 'Need reflection input for recurring quality issues.',
      avoidWhen: 'No pattern evidence yet.',
      keywords: ['lesson', 'retro', 'pattern', 'quality trend'],
    },
  ],
  'tdd-qa': [
    ...sharedEngineering,
    {
      skillId: 'strategy-validation',
      useWhen: 'Domain behavior must be validated against invariants.',
      avoidWhen: 'Change is non-domain and non-behavioral.',
      keywords: ['validation', 'invariant', 'domain test', 'strategy'],
    },
    {
      skillId: 'retrospective',
      useWhen: 'QA leakage or repeated misses are observed.',
      avoidWhen: 'No process signal available.',
      keywords: ['leakage', 'retro', 'missed bug', 'postmortem'],
    },
  ],
  'runner-backtest': [
    {
      skillId: 'strategy-validation',
      useWhen: 'Pre-release strategy behavior gate.',
      avoidWhen: 'Run is exploratory and non-gating.',
      keywords: ['gate', 'validate', 'strategy'],
    },
    {
      skillId: 'backtest-result-analysis',
      useWhen: 'Interpreting run results for tuning/promotion decisions.',
      avoidWhen: 'No valid run artifacts exist.',
      keywords: ['backtest', 'result', 'drawdown', 'pnl', 'analysis'],
    },
    {
      skillId: 'runtime-inspection',
      useWhen: 'Execution pipeline appears inconsistent or stuck.',
      avoidWhen: 'Pure strategy logic question.',
      keywords: ['runtime', 'event', 'queue', 'redis', 'transition'],
    },
  ],
  'devops-engineer': [
    {
      skillId: 'runtime-inspection',
      useWhen: 'Investigating runtime incidents or state-flow issues.',
      avoidWhen: 'Pure feature logic issue.',
      keywords: ['incident', 'runtime', 'redis', 'langgraph', 'state'],
    },
    {
      skillId: 'retrospective',
      useWhen: 'Completing incident review with actionable prevention.',
      avoidWhen: 'Incident response still active.',
      keywords: ['postmortem', 'retrospective', 'lesson'],
    },
    {
      skillId: 'knowledge-update',
      useWhen: 'Operational decision needs durable documentation.',
      avoidWhen: 'No verified incident conclusion.',
      keywords: ['runbook', 'knowledge', 'decision'],
    },
  ],
  'documentation-owner': [
    {
      skillId: 'documentation-update',
      useWhen: 'Accepted change requires canonical docs sync.',
      avoidWhen: 'No accepted technical change.',
      keywords: ['documentation', 'sync', 'spec', 'guide'],
    },
    {
      skillId: 'knowledge-update',
      useWhen: 'Knowledge layer requires durable update.',
      avoidWhen: 'Evidence not accepted yet.',
      keywords: ['knowledge', 'decision', 'lessons'],
    },
  ],
  'git-flow-manager': [
    {
      skillId: 'repo-navigation',
      useWhen: 'Need precise scope and branch/worktree impact map.',
      avoidWhen: 'Task already has validated and immutable scope.',
      keywords: ['scope', 'branch', 'worktree', 'impact'],
    },
    {
      skillId: 'refactor',
      useWhen: 'Reviewing structural patch safety and split strategy.',
      avoidWhen: 'No structural change to manage.',
      keywords: ['split', 'refactor', 'change set', 'risk'],
    },
    {
      skillId: 'documentation-update',
      useWhen: 'Git process policy docs changed.',
      avoidWhen: 'No policy/process update.',
      keywords: ['policy', 'preflight', 'workflow docs'],
    },
  ],
  'knowledge-curator': [
    {
      skillId: 'retrospective',
      useWhen: 'Extracting lessons from completed work.',
      avoidWhen: 'No closure evidence yet.',
      keywords: ['lesson', 'retro', 'outcome'],
    },
    {
      skillId: 'knowledge-update',
      useWhen: 'Converting approved findings into KB entries.',
      avoidWhen: 'Unverified claims.',
      keywords: ['knowledge', 'decision log', 'kb update'],
    },
    {
      skillId: 'skill-gap-detection',
      useWhen: 'Recurring execution weaknesses appear across tasks.',
      avoidWhen: 'Single isolated issue.',
      keywords: ['gap', 'recurring', 'missing skill'],
    },
  ],
  'domain-validator': [
    {
      skillId: 'domain-ambiguity-detection',
      useWhen: 'Requirement semantics are unclear or conflicting.',
      avoidWhen: 'Domain terms are fully quantified and accepted.',
      keywords: ['ambiguity', 'assumption', 'conflict'],
    },
    {
      skillId: 'strategy-validation',
      useWhen: 'Need strict domain validity gate.',
      avoidWhen: 'No domain behavior changed.',
      keywords: ['validate', 'domain gate', 'invariant'],
    },
    {
      skillId: 'market-structure-research',
      useWhen: 'Need market-structure grounding for rule choices.',
      avoidWhen: 'Task is non-trading technical infrastructure.',
      keywords: ['market structure', 'regime', 'swing', 'trend'],
    },
  ],
  'design-lead': [
    {
      skillId: 'architecture-review',
      useWhen: 'UI/UX change can impact component boundaries, design system consistency, or interaction contracts.',
      avoidWhen: 'Task is purely backend/internal without user-facing surface.',
      keywords: ['ui', 'ux', 'design system', 'interaction', 'layout', 'visual'],
    },
    {
      skillId: 'documentation-update',
      useWhen: 'Design decision, sign-off, or accessibility rationale must be persisted.',
      avoidWhen: 'No UI-impacting changes were accepted.',
      keywords: ['design note', 'ui review', 'a11y', 'sign-off', 'guideline'],
    },
    {
      skillId: 'test-generation',
      useWhen: 'Need explicit acceptance checks for UI behavior and edge states.',
      avoidWhen: 'No behavior or UI state delta exists.',
      keywords: ['acceptance', 'visual regression', 'state', 'empty state', 'error state'],
    },
    {
      skillId: 'research-before-implementation',
      useWhen: 'Multiple UX options or trade-offs exist and should be evaluated before coding.',
      avoidWhen: 'Design path is already fixed and approved.',
      keywords: ['ux options', 'tradeoff', 'prototype', 'explore'],
    },
  ],
};

export const SKILL_FILE_BY_ID: Record<SkillId, string> = {
  'repo-navigation': 'skills/engineering/repo-navigation/SKILL.md',
  refactor: 'skills/engineering/refactor/SKILL.md',
  'test-generation': 'skills/engineering/test-generation/SKILL.md',
  'test-fixing': 'skills/engineering/test-fixing/SKILL.md',
  'architecture-review': 'skills/engineering/architecture-review/SKILL.md',
  'documentation-update': 'skills/engineering/documentation-update/SKILL.md',
  'pipeline-selection': 'skills/runtime/pipeline-selection/SKILL.md',
  'research-before-implementation': 'skills/runtime/research-before-implementation/SKILL.md',
  retrospective: 'skills/runtime/retrospective/SKILL.md',
  'knowledge-update': 'skills/runtime/knowledge-update/SKILL.md',
  'skill-gap-detection': 'skills/runtime/skill-gap-detection/SKILL.md',
  'runtime-inspection': 'skills/runtime/runtime-inspection/SKILL.md',
  'market-structure-research': 'skills/trading/market-structure-research/SKILL.md',
  'wave-logic-formalization': 'skills/trading/wave-logic-formalization/SKILL.md',
  'domain-ambiguity-detection': 'skills/trading/domain-ambiguity-detection/SKILL.md',
  'strategy-validation': 'skills/trading/strategy-validation/SKILL.md',
  'backtest-result-analysis': 'skills/trading/backtest-result-analysis/SKILL.md',
};
