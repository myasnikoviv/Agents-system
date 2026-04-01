import fs from 'fs';
import path from 'path';

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
