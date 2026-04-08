export interface AgentPerformanceInput {
  agentSlug: string;
  invocationCount: number;
  successfulTaskCount: number;
  failedTaskCount: number;
  retryTaskCount: number;
  avgTaskDurationMs: number;
  tokenUsage: number;
}

export interface AgentPerformanceScore {
  agentSlug: string;
  score: number;
  successRate: number;
  retryCount: number;
  latencyMs: number;
  tokenUsage: number;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function scoreAgentPerformance(input: AgentPerformanceInput): AgentPerformanceScore {
  const totalAttempts = Math.max(1, Number(input.successfulTaskCount || 0) + Number(input.failedTaskCount || 0));
  const successRate = clamp01(Number(input.successfulTaskCount || 0) / totalAttempts);
  const retryPenalty = clamp01(Number(input.retryTaskCount || 0) / Math.max(1, Number(input.invocationCount || 0)));
  const latencyPenalty = clamp01(Number(input.avgTaskDurationMs || 0) / 30000); // 30s baseline
  const tokenPenalty = clamp01(Number(input.tokenUsage || 0) / 50000); // 50k baseline

  const weighted =
    successRate * 0.5 +
    (1 - retryPenalty) * 0.2 +
    (1 - latencyPenalty) * 0.2 +
    (1 - tokenPenalty) * 0.1;
  const score = Math.max(0, Math.min(100, Math.round(weighted * 100)));

  return {
    agentSlug: input.agentSlug,
    score,
    successRate,
    retryCount: Number(input.retryTaskCount || 0),
    latencyMs: Number(input.avgTaskDurationMs || 0),
    tokenUsage: Number(input.tokenUsage || 0),
  };
}
