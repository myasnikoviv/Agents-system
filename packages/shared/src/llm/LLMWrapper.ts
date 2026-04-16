import { v4 as uuidv4 } from 'uuid';
import { LLMTrace } from '@system/shared';

// Weak hook for event emission to break circular dependency
const emitEventHook = (event: any) => {
  const globalEmitter = (global as any).__AGSYS_EVENT_EMITTER__;
  if (globalEmitter) {
    globalEmitter(event);
  }
};

export interface LLMCallOptions {
  runId: string;
  projectId: string;
  chainId: string;
  model: string;
  provider: string;
  source: 'agent'|'guard'|'retry'|'system';
}

export async function wrapLLMCall<T>(
  options: LLMCallOptions,
  prompt: string,
  callFn: (prompt: string) => Promise<{ response: string; tokensInput: number; tokensOutput: number }>
): Promise<string> {
  const requestId = uuidv4();
  const startTime = Date.now();

  // 1. Emit llm.request
  emitEventHook({
    runId: options.runId,
    projectId: options.projectId,
    chainId: options.chainId,
    type: 'llm.request',
    actor: { type: 'system', id: options.model },
    payload: {
      requestId,
      prompt,
      model: options.model,
      source: options.source,
    },
  });

  try {
    // 2. Execute the call
    const result = await callFn(prompt);
    const durationMs = Date.now() - startTime;

    // 3. AGSYS-3522: Emit Telemetry Signals
    try {
      const { signalCollector } = require('../adaptive/SignalCollector');
      signalCollector.emit({
        type: 'latency',
        assetId: options.model,
        projectId: options.projectId,
        value: durationMs,
        metadata: { requestId, source: options.source }
      });

      signalCollector.emit({
        type: 'token_usage',
        assetId: options.model,
        projectId: options.projectId,
        value: result.tokensInput + result.tokensOutput,
        metadata: { requestId, input: result.tokensInput, output: result.tokensOutput }
      });
    } catch (e) {
      // Non-blocking telemetry failure
    }

    // 4. Emit llm.response
    const trace: LLMTrace = {
      requestId,
      runId: options.runId,
      model: options.model,
      provider: options.provider,
      prompt,
      response: result.response,
      tokensInput: result.tokensInput,
      tokensOutput: result.tokensOutput,
      durationMs,
      source: options.source,
      timestamp: Date.now(),
    };

    emitEventHook({
      runId: options.runId,
      projectId: options.projectId,
      chainId: options.chainId,
      type: 'llm.response',
      actor: { type: 'system', id: options.model },
      payload: trace,
    });

    return result.response;
  } catch (error: any) {
    // Emit failure event if needed, but for now we just throw
    // The higher level execution loop will catch and possibly retry.
    throw error;
  }
}
