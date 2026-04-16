import fs from 'fs';
import path from 'path';
import { ModelTier, ModelRouteDecision } from '@system/shared';
export { ModelTier, ModelRouteDecision };

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
  fallbackByTier?: Record<ModelTier, string[]>;
  unavailableModels?: string[];
  planTierCaps?: Record<string, ModelTier>;
}

interface RoutingTradeoffPolicy {
  mode?: 'cost_saver' | 'balanced' | 'quality_first';
  modes?: Record<
    string,
    {
      maxTier?: ModelTier;
      minTier?: ModelTier;
    }
  >;
  governanceAware?: {
    enabled?: boolean;
    on?: Record<
      string,
      {
        maxTier?: ModelTier;
      }
    >;
  };
}

function readJson<T>(filePath: string, defaultValue: T): T {
  if (!fs.existsSync(filePath)) return defaultValue;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return defaultValue;
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
    fallbackByTier: {
      cheap: [process.env.RUNTIME_MODEL_CHEAP_FALLBACK || 'gpt-4o-mini'],
      medium: [
        process.env.RUNTIME_MODEL_MEDIUM || 'gpt-4o',
        process.env.RUNTIME_MODEL_CHEAP || 'gpt-4o-mini',
      ],
      expensive: [
        process.env.RUNTIME_MODEL_EXPENSIVE || 'gpt-4.1',
        process.env.RUNTIME_MODEL_MEDIUM || 'gpt-4o',
        process.env.RUNTIME_MODEL_CHEAP || 'gpt-4o-mini',
      ],
    },
    unavailableModels: [],
    planTierCaps: {
      free: 'cheap',
      pro: 'medium',
      team: 'expensive',
      enterprise: 'expensive',
    },
  });
}

function pickDeterministicModelForTier(policy: ModelRoutingPolicy, tier: ModelTier): string {
  const preferred =
    policy.tierToModel?.[tier] ||
    (tier === 'cheap'
      ? process.env.RUNTIME_MODEL_CHEAP || 'gpt-4o-mini'
      : tier === 'expensive'
        ? process.env.RUNTIME_MODEL_EXPENSIVE || 'gpt-4.1'
        : process.env.RUNTIME_MODEL_MEDIUM || 'gpt-4o');

  const unavailable = new Set((policy.unavailableModels || []).map((x) => String(x || '').trim()).filter(Boolean));
  if (!unavailable.has(preferred)) return preferred;

  const fallbackChain = (policy.fallbackByTier?.[tier] || []).map((x) => String(x || '').trim()).filter(Boolean);
  for (const model of fallbackChain) {
    if (!unavailable.has(model)) return model;
  }

  // deterministic global fallback
  return process.env.RUNTIME_MODEL_CHEAP || 'gpt-4o-mini';
}

function tierRank(tier: ModelTier): number {
  if (tier === 'cheap') return 1;
  if (tier === 'medium') return 2;
  return 3;
}

function tierByRank(rank: number): ModelTier {
  if (rank <= 1) return 'cheap';
  if (rank === 2) return 'medium';
  return 'expensive';
}

function loadRoutingTradeoffPolicy(workspacePath: string): RoutingTradeoffPolicy {
  const file = path.resolve(workspacePath, 'docs/runtime/adaptive/routing-policies.json');
  return readJson<RoutingTradeoffPolicy>(file, {
    mode: 'balanced',
    modes: {
      cost_saver: { maxTier: 'cheap' },
      balanced: { maxTier: 'medium', minTier: 'cheap' },
      quality_first: { minTier: 'medium' },
    },
    governanceAware: {
      enabled: true,
      on: {
        caution: { maxTier: 'medium' },
        constrained: { maxTier: 'cheap' },
      },
    },
  });
}

export function applyCostAwareTierPolicy(input: {
  workspacePath: string;
  planName?: string;
  decision: ModelRouteDecision;
}): ModelRouteDecision {
  const policy = loadModelRoutingPolicy(input.workspacePath);
  const planName = String(input.planName || '').trim().toLowerCase();
  const defaultCaps: Record<string, ModelTier> = {
    free: 'cheap',
    pro: 'medium',
    team: 'expensive',
    enterprise: 'expensive',
  };
  const cap = (policy.planTierCaps?.[planName] || defaultCaps[planName] || null) as ModelTier | null;
  if (!cap) return input.decision;
  if (tierRank(input.decision.modelTier) <= tierRank(cap)) return input.decision;
  return {
    ...input.decision,
    modelTier: cap,
    model: pickDeterministicModelForTier(policy, cap),
    reason: `${input.decision.reason};cost_cap_by_plan:${planName}:${cap}`,
  };
}

export function applyRoutingPolicies(input: {
  workspacePath: string;
  decision: ModelRouteDecision;
  mode?: 'cost_saver' | 'balanced' | 'quality_first';
  governanceSignal?: 'normal' | 'caution' | 'constrained';
}): ModelRouteDecision {
  const policy = loadRoutingTradeoffPolicy(input.workspacePath);
  const mode = String(input.mode || policy.mode || process.env.RUNTIME_ROUTING_POLICY_MODE || 'balanced');
  const modePolicy = policy.modes?.[mode] || {};

  let nextTier = input.decision.modelTier;
  if (modePolicy.maxTier && tierRank(nextTier) > tierRank(modePolicy.maxTier)) {
    nextTier = modePolicy.maxTier;
  }
  if (modePolicy.minTier && tierRank(nextTier) < tierRank(modePolicy.minTier)) {
    nextTier = modePolicy.minTier;
  }

  const governanceSignal = String(input.governanceSignal || process.env.RUNTIME_GOVERNANCE_SIGNAL || 'normal');
  if (policy.governanceAware?.enabled) {
    const governanceCap = policy.governanceAware.on?.[governanceSignal]?.maxTier;
    if (governanceCap && tierRank(nextTier) > tierRank(governanceCap)) {
      nextTier = governanceCap;
    }
  }

  if (nextTier === input.decision.modelTier) return input.decision;
  return {
    ...input.decision,
    modelTier: nextTier,
    model: pickDeterministicModelForTier(loadModelRoutingPolicy(input.workspacePath), nextTier),
    reason: `${input.decision.reason};routing_policy:${mode};gov:${governanceSignal};tier:${nextTier}`,
  };
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
  const model = pickDeterministicModelForTier(policy, tier);

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

import { patternDetector, DetectedPattern } from './PatternDetector';
import { proposalGenerator } from '../improvement/ProposalGenerator';
import { proposalOrchestrator } from '../improvement/ProposalOrchestrator';

export async function applyPerformanceAwarePolicy(input: {
  workspacePath: string;
  projectId: string;
  assetId: string;
  decision: ModelRouteDecision;
  mode?: 'cost_saver' | 'balanced' | 'quality_first';
}): Promise<ModelRouteDecision> {
  const patterns = await patternDetector.detectPatterns(input.projectId, input.assetId);
  if (!patterns || patterns.length === 0) return input.decision;

  let nextTier = input.decision.modelTier;
  let reason = input.decision.reason;

  const criticalDeterioration = patterns.find((p) => p.type === 'SUCCESS_DETERIORATION' && p.severity === 'critical');
  const warningDeterioration = patterns.find((p) => p.type === 'SUCCESS_DETERIORATION' && p.severity === 'warn');
  const stablePattern = patterns.find((p) => p.type === 'STABLE');

  if (criticalDeterioration) {
    nextTier = 'expensive';
    reason += `;pattern_aware:CRITICAL_DETERIORATION:force_expensive`;
  } else if (warningDeterioration) {
    const currentRank = tierRank(nextTier);
    if (currentRank < 3) {
      nextTier = tierByRank(currentRank + 1);
      reason += `;pattern_aware:DETERIORATION:tier_upgrade`;
    }
  } else if (stablePattern && input.mode === 'cost_saver') {
    const currentRank = tierRank(nextTier);
    if (currentRank > 1) {
      nextTier = tierByRank(currentRank - 1);
      reason += `;pattern_aware:STABLE_COST_SAVER:tier_downgrade_trial`;
    }
  }

  if (nextTier === input.decision.modelTier && patterns.length === 0) return input.decision;

  // Generate formal proposals for detected patterns
  for (const pattern of patterns) {
    try {
      const proposal = await proposalGenerator.generateProposal(pattern, {
        id: input.assetId,
        path: `docs/process/tickets/${input.assetId}.md`, // Default mapping
        type: 'asset'
      });
      await proposalOrchestrator.saveProposal(proposal);
    } catch (e) {
      console.error('Failed to generate proposal:', e);
    }
  }

  const policy = loadModelRoutingPolicy(input.workspacePath);
  return {
    ...input.decision,
    modelTier: nextTier,
    model: pickDeterministicModelForTier(policy, nextTier),
    reason,
  };
}

export async function getAggregatedContext(projectId: string, assetId: string): Promise<any> {
  try {
    const { signalAggregator } = require('./SignalAggregator');
    return await signalAggregator.aggregateSignals(projectId, assetId);
  } catch (e) {
    return null;
  }
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
