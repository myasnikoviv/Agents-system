import fs from 'fs';
import path from 'path';

export type ModelTier = 'cheap' | 'medium' | 'expensive';

export interface ModelRouteDecision {
  runId: string;
  projectId: string;
  taskType: string;
  modelTier: ModelTier;
  model: string;
  reason: string;
}

export interface LearningSignals {
  runId: string;
  projectId: string;
  tokens: number;
  retries: number;
  loops: number;
  complianceFailures: number;
}

export interface AdaptivePolicy {
  retryLimit: number;
  enableImprovementLoop: boolean;
  preferredTier: ModelTier;
  reason: string;
}

interface ModelRoutingPolicy {
  defaultTier?: ModelTier;
  taskTypeToTier?: Record<string, ModelTier>;
  tierToModel?: Record<ModelTier, string>;
}

function readJson<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

function detectTaskType(message: string): string {
  const text = String(message || '').toLowerCase();
  if (!text.trim()) return 'general';
  if (/(classify|classification|router|route)/.test(text)) return 'classification';
  if (/(fix|bug|error|issue|hotfix)/.test(text)) return 'bugfix';
  if (/(refactor|cleanup|optimi[sz]e)/.test(text)) return 'refactor';
  if (/(research|audit|analy[sz]e|investigate)/.test(text)) return 'research';
  if (/(design|architecture|system design)/.test(text)) return 'design';
  return 'general';
}

function loadModelRoutingPolicy(workspacePath: string): ModelRoutingPolicy {
  const file = path.resolve(workspacePath, 'docs/runtime/adaptive/model-routing-policy.json');
  return readJson<ModelRoutingPolicy>(file, {
    defaultTier: 'medium',
    taskTypeToTier: {
      classification: 'cheap',
      research: 'medium',
      bugfix: 'medium',
      refactor: 'medium',
      design: 'expensive',
      general: 'medium',
    },
    tierToModel: {
      cheap: process.env.RUNTIME_MODEL_CHEAP || 'gpt-4o-mini',
      medium: process.env.RUNTIME_MODEL_MEDIUM || 'gpt-4o',
      expensive: process.env.RUNTIME_MODEL_EXPENSIVE || 'gpt-4.1',
    },
  });
}

export function routeModelForTask(input: {
  workspacePath: string;
  runId: string;
  projectId: string;
  userMessage: string;
}): ModelRouteDecision {
  const policy = loadModelRoutingPolicy(input.workspacePath);
  const taskType = detectTaskType(input.userMessage);
  const tier = policy.taskTypeToTier?.[taskType] || policy.defaultTier || 'medium';
  const model =
    policy.tierToModel?.[tier] ||
    (tier === 'cheap'
      ? process.env.RUNTIME_MODEL_CHEAP || 'gpt-4o-mini'
      : tier === 'expensive'
        ? process.env.RUNTIME_MODEL_EXPENSIVE || 'gpt-4.1'
        : process.env.RUNTIME_MODEL_MEDIUM || 'gpt-4o');

  return {
    runId: input.runId,
    projectId: input.projectId,
    taskType,
    modelTier: tier,
    model,
    reason: `taskType=${taskType};tier=${tier}`,
  };
}

export function collectLearningSignals(workspacePath: string, runId: string, projectId: string): LearningSignals {
  const costFile = path.resolve(workspacePath, 'docs/process/runs/cost', `${runId}.json`);
  const cost = readJson<any>(costFile, {});

  const governanceDir = path.resolve(workspacePath, 'docs/runtime/governance/logs');
  let complianceFailures = 0;
  if (fs.existsSync(governanceDir)) {
    const files = fs.readdirSync(governanceDir).filter((f) => f.endsWith('.jsonl'));
    for (const file of files.slice(-5)) {
      const lines = fs
        .readFileSync(path.join(governanceDir, file), 'utf-8')
        .split('\n')
        .filter(Boolean);
      for (const line of lines) {
        try {
          const row = JSON.parse(line);
          if (row?.runId === runId && row?.rule === 'compliance_engine' && row?.status === 'fail') {
            complianceFailures += 1;
          }
        } catch {
          // ignore malformed rows
        }
      }
    }
  }

  return {
    runId,
    projectId,
    tokens: Number(cost?.tokens || 0),
    retries: Number(cost?.retries || 0),
    loops: Number(cost?.loops || 0),
    complianceFailures,
  };
}

export function decideAdaptivePolicy(signals: LearningSignals): AdaptivePolicy {
  if (signals.complianceFailures > 0) {
    return {
      retryLimit: 2,
      enableImprovementLoop: true,
      preferredTier: 'expensive',
      reason: 'compliance_failures_detected',
    };
  }

  if (signals.tokens > 100000 || signals.retries > 2) {
    return {
      retryLimit: 1,
      enableImprovementLoop: false,
      preferredTier: 'cheap',
      reason: 'high_cost_or_retry_pressure',
    };
  }

  return {
    retryLimit: 1,
    enableImprovementLoop: true,
    preferredTier: 'medium',
    reason: 'stable_default_profile',
  };
}

export function enforceBoundedAdaptation(
  previous: AdaptivePolicy | null,
  next: AdaptivePolicy,
  maxRetryDelta = 1,
): AdaptivePolicy {
  if (!previous) return next;
  const retryDelta = next.retryLimit - previous.retryLimit;
  const boundedRetry =
    Math.abs(retryDelta) > maxRetryDelta
      ? previous.retryLimit + (retryDelta > 0 ? maxRetryDelta : -maxRetryDelta)
      : next.retryLimit;

  return {
    ...next,
    retryLimit: Math.max(0, boundedRetry),
    reason: `${next.reason};bounded=true`,
  };
}

export function writeAdaptiveLog(workspacePath: string, payload: {
  runId: string;
  projectId: string;
  route: ModelRouteDecision;
  policy: AdaptivePolicy;
  signals?: LearningSignals;
}): string {
  const dir = path.resolve(workspacePath, 'docs/process/runs/adaptive');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${payload.runId}.json`);
  fs.writeFileSync(
    file,
    JSON.stringify({ ...payload, timestamp: new Date().toISOString() }, null, 2),
    'utf-8',
  );
  return file;
}
