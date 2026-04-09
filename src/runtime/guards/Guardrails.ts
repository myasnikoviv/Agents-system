import { emitEvent } from '../events/EventBus';
import { RuntimeEvent } from '../events/types';

export class Guardrails {
  private static llmCallCounts = new Map<string, number>();
  private static startTimeMap = new Map<string, number>();
  private static retryCounts = new Map<string, number>();

  static readonly MAX_TOTAL_LLM_CALLS = 120;
  static readonly MAX_RUN_TIME_MS = 600000;
  static readonly MAX_RETRIES_PER_STEP = 2;
  static getMaxRetriesPerStep(): number {
    const raw = Number(process.env.RUNTIME_MAX_RETRIES_PER_STEP || this.MAX_RETRIES_PER_STEP);
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : this.MAX_RETRIES_PER_STEP;
  }

  static getMaxRunTimeMs(): number {
    const raw = Number(process.env.RUNTIME_MAX_RUN_TIME_MS || this.MAX_RUN_TIME_MS);
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : this.MAX_RUN_TIME_MS;
  }

  static getMaxTotalLlmCalls(): number {
    const raw = Number(process.env.RUNTIME_MAX_TOTAL_LLM_CALLS || this.MAX_TOTAL_LLM_CALLS);
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : this.MAX_TOTAL_LLM_CALLS;
  }

  static recordLLMCall(runId: string) {
    const current = this.llmCallCounts.get(runId) || 0;
    this.llmCallCounts.set(runId, current + 1);
    
    const maxTotalLlmCalls = this.getMaxTotalLlmCalls();
    if (current + 1 > maxTotalLlmCalls) {
      emitEvent({
        runId,
        projectId: 'none',
        chainId: 'none',
        type: 'guard.triggered',
        payload: { reason: 'MAX_TOTAL_LLM_CALLS_EXCEEDED', count: current + 1, maxTotalLlmCalls }
      });
      throw new Error(`Guardrail triggered: Maximum total LLM calls (${maxTotalLlmCalls}) exceeded for run ${runId}`);
    }
  }

  static checkTimeLimit(runId: string) {
    if (!this.startTimeMap.has(runId)) {
      this.startTimeMap.set(runId, Date.now());
      return;
    }

    const elapsed = Date.now() - (this.startTimeMap.get(runId) || 0);
    const maxRunTimeMs = this.getMaxRunTimeMs();
    if (elapsed > maxRunTimeMs) {
      emitEvent({
        runId,
        projectId: 'none',
        chainId: 'none',
        type: 'guard.triggered',
        payload: { reason: 'MAX_RUN_TIME_EXCEEDED', elapsedMs: elapsed, maxRunTimeMs }
      });
      const seconds = Math.floor(maxRunTimeMs / 1000);
      throw new Error(`Guardrail triggered: Maximum run time (${seconds}s) exceeded for run ${runId}`);
    }
  }

  static incrementRetry(runId: string, stepId: string): number {
    const key = `${runId}:${stepId}`;
    const current = this.retryCounts.get(key) || 0;
    this.retryCounts.set(key, current + 1);

    const maxRetries = this.getMaxRetriesPerStep();
    if (current + 1 > maxRetries) {
      emitEvent({
        runId,
        projectId: 'none',
        chainId: 'none',
        type: 'guard.triggered',
        payload: { reason: 'MAX_RETRIES_EXCEEDED', stepId, count: current + 1, maxRetries }
      });
      throw new Error(`Guardrail triggered: Maximum retries (${maxRetries}) exceeded for step ${stepId} in run ${runId}`);
    }

    emitEvent({
      runId,
      projectId: 'none',
      chainId: 'none',
      type: 'guard.retry',
      payload: { stepId, attempt: current + 1 }
    });

    return current + 1;
  }

  static clear(runId: string) {
    this.llmCallCounts.delete(runId);
    this.startTimeMap.delete(runId);
    // Note: we might want to keep retry counts or clear them per step
  }
}
