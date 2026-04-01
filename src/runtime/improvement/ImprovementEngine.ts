import fs from 'fs';
import path from 'path';
import { getRedisClient } from '../redisClient';

export type ImprovementSignalType = 'compliance_issue' | 'cost_issue' | 'throughput_bottleneck';

export interface ImprovementSignal {
  id: string;
  runId: string;
  projectId: string;
  type: ImprovementSignalType;
  severity: 'low' | 'medium' | 'high';
  source: string;
  summary: string;
  metrics?: Record<string, number | string | boolean>;
}

export interface ImprovementTicketDraft {
  type: 'agent_system_improvement';
  scope: string;
  title: string;
  description: string;
  runId: string;
  signalIds: string[];
  priority: 'low' | 'medium' | 'high';
}

export interface LearningEffectKpiResult {
  pass: boolean;
  score: number;
  reason: string;
}

function readJson<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

function readJsonl(filePath: string): any[] {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean).map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter(Boolean);
}

function signalId(runId: string, type: ImprovementSignalType, idx: number): string {
  return `${runId}:${type}:${idx}`;
}

export function generateImprovementSignals(input: {
  workspacePath: string;
  runId: string;
  projectId: string;
}): ImprovementSignal[] {
  const out: ImprovementSignal[] = [];
  const cost = readJson<any>(
    path.resolve(input.workspacePath, 'docs/process/runs/cost', `${input.runId}.json`),
    {},
  );
  const adaptive = readJson<any>(
    path.resolve(input.workspacePath, 'docs/process/runs/adaptive', `${input.runId}.json`),
    {},
  );

  const governanceFiles = path.resolve(input.workspacePath, 'docs/runtime/governance/logs');
  let complianceFails = 0;
  if (fs.existsSync(governanceFiles)) {
    const files = fs.readdirSync(governanceFiles).filter((f) => f.endsWith('.jsonl')).slice(-8);
    for (const file of files) {
      const rows = readJsonl(path.join(governanceFiles, file));
      for (const row of rows) {
        if (row?.runId === input.runId && row?.rule === 'compliance_engine' && row?.status === 'fail') {
          complianceFails += 1;
        }
      }
    }
  }

  if (complianceFails > 0) {
    out.push({
      id: signalId(input.runId, 'compliance_issue', out.length + 1),
      runId: input.runId,
      projectId: input.projectId,
      type: 'compliance_issue',
      severity: 'high',
      source: 'governance_logs',
      summary: `Detected ${complianceFails} compliance failures for run`,
      metrics: { complianceFails },
    });
  }

  const tokens = Number(cost?.tokens || 0);
  const retries = Number(cost?.retries || 0);
  const loops = Number(cost?.loops || 0);
  if (tokens > 100000 || retries > 2) {
    out.push({
      id: signalId(input.runId, 'cost_issue', out.length + 1),
      runId: input.runId,
      projectId: input.projectId,
      type: 'cost_issue',
      severity: tokens > 150000 ? 'high' : 'medium',
      source: 'cost_ledger',
      summary: 'High runtime cost pressure detected',
      metrics: { tokens, retries, loops },
    });
  }

  if (loops > 6 || retries > 3 || adaptive?.policy?.enableImprovementLoop === true) {
    out.push({
      id: signalId(input.runId, 'throughput_bottleneck', out.length + 1),
      runId: input.runId,
      projectId: input.projectId,
      type: 'throughput_bottleneck',
      severity: loops > 10 ? 'high' : 'medium',
      source: 'adaptive_policy',
      summary: 'Potential throughput bottleneck from loops/retries',
      metrics: { loops, retries },
    });
  }

  return out;
}

export function aggregateSignals(signals: ImprovementSignal[]): ImprovementSignal[] {
  const bucket = new Map<string, ImprovementSignal>();
  for (const s of signals) {
    const key = `${s.type}:${s.summary}`;
    const existing = bucket.get(key);
    if (!existing) {
      bucket.set(key, s);
      continue;
    }
    const oldWeight = existing.severity === 'high' ? 3 : existing.severity === 'medium' ? 2 : 1;
    const newWeight = s.severity === 'high' ? 3 : s.severity === 'medium' ? 2 : 1;
    if (newWeight > oldWeight) bucket.set(key, s);
  }
  return Array.from(bucket.values());
}

export function buildImprovementTicketDrafts(signals: ImprovementSignal[]): ImprovementTicketDraft[] {
  return signals.map((s) => ({
    type: 'agent_system_improvement',
    scope: s.type,
    title: `[AUTO] ${s.type}: ${s.summary}`,
    description: `Signal ${s.id} from run ${s.runId}. Source: ${s.source}. Metrics: ${JSON.stringify(s.metrics || {})}`,
    runId: s.runId,
    signalIds: [s.id],
    priority: s.severity,
  }));
}

export function writeImprovementArtifacts(input: {
  workspacePath: string;
  runId: string;
  signals: ImprovementSignal[];
  tickets: ImprovementTicketDraft[];
  commitSha?: string;
}): { signalsPath: string; ticketsPath: string; tracePath: string } {
  const base = path.resolve(input.workspacePath, 'docs/process/improvements');
  const signalsDir = path.join(base, 'signals');
  const ticketsDir = path.join(base, 'tickets');
  const traceDir = path.join(base, 'traceability');
  fs.mkdirSync(signalsDir, { recursive: true });
  fs.mkdirSync(ticketsDir, { recursive: true });
  fs.mkdirSync(traceDir, { recursive: true });

  const signalsPath = path.join(signalsDir, `${input.runId}.json`);
  const ticketsPath = path.join(ticketsDir, `${input.runId}.json`);
  const tracePath = path.join(traceDir, `${input.runId}.json`);
  const lockPath = path.join(base, `${input.runId}.lock`);

  // Basic race protection for parallel writers of the same run artifact set.
  let lockFd: number | null = null;
  try {
    lockFd = fs.openSync(lockPath, 'wx');
  } catch {
    throw new Error(`improvement_artifacts_lock_conflict:${input.runId}`);
  }

  try {
    fs.writeFileSync(signalsPath, JSON.stringify({ runId: input.runId, signals: input.signals }, null, 2), 'utf-8');
    fs.writeFileSync(ticketsPath, JSON.stringify({ runId: input.runId, tickets: input.tickets }, null, 2), 'utf-8');
    fs.writeFileSync(
      tracePath,
      JSON.stringify(
        {
          runId: input.runId,
          signalIds: input.signals.map((s) => s.id),
          ticketTitles: input.tickets.map((t) => t.title),
          commitSha: input.commitSha || process.env.GIT_COMMIT_SHA || 'uncommitted',
          timestamp: new Date().toISOString(),
        },
        null,
        2,
      ),
      'utf-8',
    );
  } finally {
    if (lockFd !== null) fs.closeSync(lockFd);
    if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
  }

  return { signalsPath, ticketsPath, tracePath };
}

export function queueIsolationKeys(projectId: string): {
  runtimeQueue: string;
  improvementQueue: string;
} {
  return {
    runtimeQueue: `events:runtime:${projectId}`,
    improvementQueue: `events:improvement:${projectId}`,
  };
}

export async function enqueueImprovementJob(input: {
  runId: string;
  projectId: string;
  chainId: string;
  workspacePath: string;
  signalsPath: string;
  ticketsPath: string;
}): Promise<string | null> {
  const redis = getRedisClient();
  const queue = queueIsolationKeys(input.projectId).improvementQueue;
  const payload = {
    type: 'improvement.job',
    runId: input.runId,
    projectId: input.projectId,
    chainId: input.chainId,
    payload: {
      workspacePath: input.workspacePath,
      signalsPath: input.signalsPath,
      ticketsPath: input.ticketsPath,
    },
  };
  try {
    const id = await redis.xadd(queue, '*', 'data', JSON.stringify(payload));
    return id || null;
  } catch {
    return null;
  }
}

export function evaluateLearningEffectKpi(input: {
  signals: ImprovementSignal[];
  tickets: ImprovementTicketDraft[];
  complianceFailures: number;
  retries: number;
}): LearningEffectKpiResult {
  const hasSignalCoverage = input.signals.length > 0 ? 1 : 0;
  const hasTicketCoverage = input.tickets.length > 0 ? 1 : 0;
  const noComplianceFailures = input.complianceFailures === 0 ? 1 : 0;
  const boundedRetries = input.retries <= 2 ? 1 : 0;
  const score = (hasSignalCoverage + hasTicketCoverage + noComplianceFailures + boundedRetries) / 4;
  return {
    pass: score >= 0.75,
    score,
    reason: `signals=${input.signals.length};tickets=${input.tickets.length};complianceFailures=${input.complianceFailures};retries=${input.retries}`,
  };
}

export function applySafeTemplateUpdate(input: {
  workspacePath: string;
  relativePath: string;
  content: string;
}): { updated: boolean; filePath: string; backupPath?: string; reason?: string } {
  const rel = input.relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!rel.startsWith('generated/templates/')) {
    return { updated: false, filePath: rel, reason: 'path_not_in_generated_templates' };
  }

  const filePath = path.resolve(input.workspacePath, rel);
  if (!filePath.startsWith(path.resolve(input.workspacePath, 'generated/templates'))) {
    return { updated: false, filePath, reason: 'path_escape_blocked' };
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const backupPath = fs.existsSync(filePath) ? `${filePath}.bak-${Date.now()}` : undefined;
  if (backupPath) fs.copyFileSync(filePath, backupPath);

  const tempPath = `${filePath}.tmp-${Date.now()}`;
  fs.writeFileSync(tempPath, input.content, 'utf-8');
  fs.renameSync(tempPath, filePath);
  return { updated: true, filePath, backupPath };
}
