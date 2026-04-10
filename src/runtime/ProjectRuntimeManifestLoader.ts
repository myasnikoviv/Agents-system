import fs from 'fs/promises';
import path from 'path';
import {
  ManifestAgentSpec,
  ManifestGateSpec,
  ManifestPipelineSpec,
  ManifestSelectionRule,
  ManifestSkillSpec,
  ManifestStageSpec,
  ManifestTransitionSpec,
  ProjectRuntimeManifest,
} from './ProjectRuntimeManifest';

type LoaderOptions = {
  projectRoot?: string;
  preferCanonicalBundle?: boolean;
};

const AGENT_ROLE_OVERRIDES: Record<string, string> = {
  intake: 'pm-orchestrator',
  research: 'research-agent',
  trader: 'trader-analyst',
  architecture: 'solution-architect',
  qa: 'tdd-qa',
  developer: 'developer',
  review: 'code-reviewer',
  reviewer: 'code-reviewer',
  domain: 'domain-validator',
  git: 'git-flow-manager',
  docs: 'documentation-owner',
  runner: 'runner-backtest',
  retrospective: 'knowledge-curator',
};

const DEFAULT_GATES: ManifestGateSpec[] = [
  {
    id: 'git-preflight',
    type: 'pre-stage',
    rule: 'require approved preflight token before mutating stage',
    severity: 'hard',
    failureStatus: 'blocked',
  },
  {
    id: 'postflight-validation',
    type: 'pre-pipeline-close',
    rule: 'require CLI/API and UI postflight evidence (or explicit N/A rationale)',
    severity: 'hard',
    failureStatus: 'rework',
  },
];

const CANONICAL_MANIFEST_CANDIDATES = [
  path.join('docs', 'runtime', 'project-runtime-manifest.v1.json'),
  path.join('docs', 'runtime', 'project-runtime-manifest.json'),
];
function normalizeId(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function extractSection(content: string, header: string): string {
  const regex = new RegExp(`## ${header}\\n+([\\s\\S]*?)(?=\\n## |$)`, 'i');
  const match = content.match(regex);
  return match?.[1]?.trim() || '';
}

function extractList(section: string): string[] {
  return section
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.replace(/^-\s+/, '').trim())
    .filter((line) => line.length > 0);
}

function inferRoleFromStep(text: string): string {
  const lowered = text.toLowerCase();
  for (const [token, role] of Object.entries(AGENT_ROLE_OVERRIDES)) {
    if (lowered.includes(token)) {
      return role;
    }
  }
  return 'pm-orchestrator';
}

function inferStageIdFromStep(text: string, index: number): string {
  const lowered = text.toLowerCase();
  for (const token of Object.keys(AGENT_ROLE_OVERRIDES)) {
    if (lowered.includes(token)) {
      return `${token}-${index + 1}`;
    }
  }
  return `stage-${index + 1}`;
}

function inferSelectionRulesFromPipelineId(id: string): ManifestSelectionRule[] {
  const parts = id.split('-').filter((p) => p.length > 0);
  if (parts.length === 0) {
    return [{ keywords: [id], scoreWeight: 1 }];
  }
  return [{ keywords: parts, scoreWeight: 1 }];
}

async function readMarkdownFiles(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && e.name.endsWith('.md'))
      .map((e) => path.join(dir, e.name))
      .sort();
  } catch {
    return [];
  }
}

async function tryReadCanonicalManifest(projectRoot: string): Promise<ProjectRuntimeManifest | null> {
  for (const relPath of CANONICAL_MANIFEST_CANDIDATES) {
    const absPath = path.join(projectRoot, relPath);
    try {
      const raw = await fs.readFile(absPath, 'utf-8');
      return JSON.parse(raw) as ProjectRuntimeManifest;
    } catch {
      // Keep trying the next candidate.
    }
  }
  return null;
}
async function loadAgents(projectRoot: string): Promise<ManifestAgentSpec[]> {
  const files = await readMarkdownFiles(path.join(projectRoot, 'docs', 'agents'));
  const out: ManifestAgentSpec[] = [];

  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');
    const base = path.basename(file, '.md');
    const title = content.split('\n')[0]?.replace(/^#\s+/, '').trim() || base;
    const guardrails = extractList(extractSection(content, 'Guardrails'));

    const capabilitiesRaw = extractSection(content, 'MCP Servers');
    const capabilities = Array.from(new Set((capabilitiesRaw.match(/`([^`]+)`/g) || [])
      .map((token) => token.replace(/`/g, ''))));

    out.push({
      id: base,
      callsign: title,
      file: path.relative(projectRoot, file),
      capabilities,
      guardrails,
      defaultSkills: [base.endsWith('-agent') ? base : `${base}-skill`],
    });
  }

  return out;
}

async function loadSkills(projectRoot: string): Promise<ManifestSkillSpec[]> {
  const files = await readMarkdownFiles(path.join(projectRoot, 'docs', 'skills'));
  const out: ManifestSkillSpec[] = [];

  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');
    const base = path.basename(file, '.md');
    const title = content.split('\n')[0]?.replace(/^#\s+/, '').trim() || base;

    const useWhen = extractList(extractSection(content, 'When To Use')).join(' | ');
    const avoidWhen = extractList(extractSection(content, 'Constraints')).join(' | ');

    out.push({
      id: normalizeId(base),
      name: title,
      source: path.relative(projectRoot, file),
      triggerRules: [
        {
          useWhen: useWhen || 'Use according to role workflow.',
          avoidWhen: avoidWhen || 'Avoid when constraints are violated.',
          keywords: Array.from(new Set(normalizeId(base).split('-').filter(Boolean))),
        },
      ],
    });
  }

  return out;
}

async function loadPipelines(projectRoot: string): Promise<ManifestPipelineSpec[]> {
  const files = await readMarkdownFiles(path.join(projectRoot, 'docs', 'pipelines'));
  const out: ManifestPipelineSpec[] = [];

  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');
    const id = normalizeId(path.basename(file, '.md'));
    const stepsSection = extractSection(content, 'Steps');
    const stepLines = stepsSection
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => /^\d+\.\s+/.test(line));

    const stages: ManifestStageSpec[] =
      stepLines.length > 0
        ? stepLines.map((line, idx) => {
            const body = line.replace(/^\d+\.\s+/, '');
            const stageId = inferStageIdFromStep(body, idx);
            return {
              id: stageId,
              role: inferRoleFromStep(body),
              requiredGates: ['git-preflight'],
              outputs: ['pipeline-state-update'],
            };
          })
        : [
            {
              id: 'intake-1',
              role: 'pm-orchestrator',
              requiredGates: ['git-preflight'],
              outputs: ['pipeline-state-update'],
            },
          ];

    const transitions: ManifestTransitionSpec[] = [];
    for (let i = 0; i < stages.length - 1; i += 1) {
      const from = stages[i]?.id;
      const to = stages[i + 1]?.id;
      if (from && to) {
        transitions.push({ from, to });
      }
    }

    out.push({
      id,
      source: path.relative(projectRoot, file),
      stages,
      transitions,
      selectionRules: inferSelectionRulesFromPipelineId(id),
      default: id === 'unified-task-intake',
    });
  }

  return out;
}

export async function loadProjectRuntimeManifest(options: LoaderOptions = {}): Promise<ProjectRuntimeManifest> {
  let projectRoot = options.projectRoot;
  
  if (!projectRoot) {
    throw new Error('Project root must be explicitly provided to load manifest.');
  }

  // If projectRoot is a relative path or just a project name (e.g. 'trade-bot'), 
  // try to resolve it relative to the Agents system projects directory first.
  if (!path.isAbsolute(projectRoot)) {
    const agentsSystemRoot = path.resolve(__dirname, '..', '..');
    const projectPathInAgents = path.resolve(agentsSystemRoot, 'projects', projectRoot);
    if (await fs.access(projectPathInAgents).then(() => true).catch(() => false)) {
      projectRoot = projectPathInAgents;
    } else {
      projectRoot = path.resolve(projectRoot);
    }
  }

  const preferCanonicalBundle = options.preferCanonicalBundle ?? true;

  if (preferCanonicalBundle) {
    const canonicalManifest = await tryReadCanonicalManifest(projectRoot);
    if (canonicalManifest) {
      return canonicalManifest;
    }
  }

  const [agents, skills, pipelines] = await Promise.all([
    loadAgents(projectRoot),
    loadSkills(projectRoot),
    loadPipelines(projectRoot),
  ]);

  return {
    manifestVersion: '1.0',
    project: {
      id: normalizeId(path.basename(projectRoot)),
      name: path.basename(projectRoot),
      rootPath: projectRoot,
    },
    agents,
    skills,
    pipelines,
    policies: {
      gates: DEFAULT_GATES,
    },
    metadata: {
      loader: 'markdown-adapter-v1',
    },
  };
}
