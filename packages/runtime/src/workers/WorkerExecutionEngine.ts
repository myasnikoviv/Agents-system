import { executeRunContextInSubprocess } from './WorkerProcessExecutor';

export interface WorkerExecutionTaskInput {
  runContext: any;
  timeoutMs: number;
  stageId: string;
  agentSlug: string;
}

export interface WorkerExecutionTaskResult {
  ok: boolean;
  content: string;
  error?: string;
  failed: boolean;
}

async function runWithTimeout<T>(task: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | null = null;
  try {
    return await Promise.race([
      task,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`stage_timeout_exceeded:${label}:${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export class WorkerExecutionEngine {
  static async executeTask(input: WorkerExecutionTaskInput): Promise<WorkerExecutionTaskResult> {
    const label = `${input.stageId}:${input.agentSlug}:subprocess`;
    try {
      const result = await runWithTimeout(
        executeRunContextInSubprocess({ runContext: input.runContext, timeoutMs: input.timeoutMs }),
        input.timeoutMs,
        label,
      );
      return {
        ok: true,
        content: String(result.content || ''),
        failed: false,
      };
    } catch (error: any) {
      return {
        ok: false,
        content: '',
        error: String(error?.message || error || 'worker_execution_failed'),
        failed: true,
      };
    }
  }
}

