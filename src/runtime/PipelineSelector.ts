import { loadProjectRuntimeManifest } from './ProjectRuntimeManifestLoader';
import { ProjectRuntimeManifest } from './ProjectRuntimeManifest';

export type PipelineId = string;

type LegacyPipelineRule = {
  id: PipelineId;
  keywords: string[];
  reason: string;
};

const LEGACY_PIPELINE_RULES: LegacyPipelineRule[] = [
  {
    id: 'git-conflict-recovery',
    keywords: ['wrong branch', 'worktree', 'branch mismatch', 'git conflict', 'wrong-branch', 'recovery'],
    reason: 'Detected git/worktree conflict language.',
  },
  {
    id: 'rollback-incident',
    keywords: ['incident', 'rollback', 'outage', 'sev', 'production broken'],
    reason: 'Detected incident/rollback context.',
  },
  {
    id: 'hotfix',
    keywords: ['urgent fix', 'critical bug', 'asap fix', 'hotfix'],
    reason: 'Detected urgent fix context.',
  },
  {
    id: 'release',
    keywords: ['release', 'ship', 'deploy', 'go live'],
    reason: 'Detected release/deploy context.',
  },
  {
    id: 'strategy-tuning',
    keywords: ['backtest', 'tuning', 'optimize strategy', 'wave logic', 'market structure'],
    reason: 'Detected trading strategy iteration context.',
  },
  {
    id: 'refactor',
    keywords: ['refactor', 'cleanup', 'restructure', 'tech debt'],
    reason: 'Detected structural improvement request.',
  },
  {
    id: 'new-feature',
    keywords: ['new feature', 'build feature', 'implement from scratch', 'add capability'],
    reason: 'Detected new capability request.',
  },
  {
    id: 'feature-change',
    keywords: ['change feature', 'modify feature', 'extend feature', 'update behavior'],
    reason: 'Detected existing feature modification.',
  },
  {
    id: 'bug-fix',
    keywords: ['bug', 'fix', 'broken', 'error', 'regression'],
    reason: 'Detected bug-fix context.',
  },
  {
    id: 'retrospective-learning',
    keywords: ['retrospective', 'postmortem', 'lessons learned'],
    reason: 'Detected retrospective/learning context.',
  },
];

export interface PipelineSelection {
  selectedPipeline: PipelineId;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

function scoreByKeywords(message: string, keywords: string[]): number {
  const lowered = message.toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    if (lowered.includes(kw.toLowerCase())) {
      score += 1;
    }
  }
  return score;
}

function selectDefaultPipelineFromManifest(manifest: ProjectRuntimeManifest): string {
  const defaultPipeline = manifest.pipelines.find((p) => p.default === true);
  if (defaultPipeline) return defaultPipeline.id;
  return manifest.pipelines[0]?.id || 'unified-task-intake';
}

export function selectPipelineFromManifest(
  message: string,
  manifest: ProjectRuntimeManifest,
): PipelineSelection {
  const defaultPipeline = selectDefaultPipelineFromManifest(manifest);

  let best: { id: string; score: number; reason: string } | null = null;

  for (const pipeline of manifest.pipelines) {
    const weightedScore = pipeline.selectionRules.reduce((acc, rule) => {
      const local = scoreByKeywords(message, rule.keywords || []);
      const weight = rule.scoreWeight ?? 1;
      return acc + local * weight;
    }, 0);

    if (weightedScore <= 0) continue;

    if (!best || weightedScore > best.score) {
      best = {
        id: pipeline.id,
        score: weightedScore,
        reason: `Matched project selection rules from ${pipeline.source}`,
      };
    }
  }

  if (!best) {
    return {
      selectedPipeline: defaultPipeline,
      confidence: 'low',
      reason: 'No project rule matched; using project default pipeline.',
    };
  }

  if (best.score >= 2) {
    return { selectedPipeline: best.id, confidence: 'high', reason: best.reason };
  }

  return { selectedPipeline: best.id, confidence: 'medium', reason: best.reason };
}

export function selectPipelineFromMessage(message: string): PipelineSelection {
  const lowered = message.toLowerCase();
  let best: { rule: LegacyPipelineRule; score: number } | null = null;

  for (const rule of LEGACY_PIPELINE_RULES) {
    const score = rule.keywords.reduce((acc, kw) => acc + (lowered.includes(kw) ? 1 : 0), 0);
    if (score === 0) continue;
    if (!best || score > best.score) {
      best = { rule, score };
    }
  }

  if (!best) {
    return {
      selectedPipeline: 'unified-task-intake',
      confidence: 'low',
      reason: 'No strong legacy signal found; defaulting to intake pipeline.',
    };
  }

  if (best.score >= 2) {
    return { selectedPipeline: best.rule.id, confidence: 'high', reason: best.rule.reason };
  }

  return { selectedPipeline: best.rule.id, confidence: 'medium', reason: best.rule.reason };
}

export async function selectPipelineForProject(
  message: string,
  projectRoot: string = process.cwd(),
): Promise<PipelineSelection> {
  try {
    const manifest = await loadProjectRuntimeManifest({ projectRoot });
    return selectPipelineFromManifest(message, manifest);
  } catch (e: any) {
    return {
      ...selectPipelineFromMessage(message),
      reason: `Manifest unavailable, switched to legacy selector: ${e?.message || 'unknown error'}`,
    };
  }
}
