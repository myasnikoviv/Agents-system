import { v4 as uuidv4 } from 'uuid';
import { emitEvent } from '../events/EventBus';
import { LLMTrace, RuntimeEvent } from '../events/types';

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
  emitEvent({
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

    // 3. Emit llm.response
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

    emitEvent({
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
