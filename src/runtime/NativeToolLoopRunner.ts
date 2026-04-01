import { RunContext } from './context/RunContext';
import { ExecutionAdapter, ExecutionResult } from './adapters/ExecutionAdapter';
import { emitSwarmEvent } from './events/EventBus';
import { executeViaWorkbench } from './WorkbenchGateway';

export interface ToolResult {
  tool: string;
  status: 'success' | 'failed';
  content: any;
  summary: string;
  error?: string;
}

export interface ToolExecutionContext {
  runId: string;
  projectId: string;
  workspacePath: string;
}

export class NativeToolLoopRunner {
  private maxIterations = 15;

  constructor(private adapter: ExecutionAdapter) {}

  private summarizeToolContent(content: unknown, fallback: string): string {
    if (content === null || content === undefined) return fallback;
    if (typeof content === 'string') {
      const normalized = content.replace(/\s+/g, ' ').trim();
      if (!normalized) return fallback;
      return normalized.length > 260 ? `${normalized.slice(0, 259)}…` : normalized;
    }
    try {
      const json = JSON.stringify(content);
      if (!json) return fallback;
      return json.length > 260 ? `${json.slice(0, 259)}…` : json;
    } catch {
      return fallback;
    }
  }

  async run(context: RunContext): Promise<ExecutionResult> {
    let iteration = 0;
    let currentContext = { ...context };
    let lastResult: ExecutionResult | null = null;

    const { Guardrails } = await import('./guards/Guardrails');

    while (iteration < this.maxIterations) {
      iteration++;
      
      // 0. Update and check guardrails
      const { RunManager } = await import('./context/RunManager');
      RunManager.checkCancellation(context.runId);

      Guardrails.checkTimeLimit(context.runId);
      Guardrails.recordLLMCall(context.runId);

      const result = await this.adapter.execute(currentContext);
      lastResult = result;

      console.log(`[AUDIT] model_step_${iteration}_raw:`, JSON.stringify(result.content || ""));

      if (!result.ok) {
        try {
          const attempt = Guardrails.incrementRetry(context.runId, `step_${iteration}`);
          console.log(`[NativeToolLoop] Retrying step_${iteration}, attempt ${attempt}`);
          iteration--; // Backtrack one iteration to retry the same logical step
          continue;
        } catch (guardError: any) {
          return result; // Max retries exceeded, return the original failure
        }
      }

      // 1. Check if the model wants to call a tool
      if (result.responseMode === 'tool_call' && (result as any).toolCalls) {
        const toolCalls = (result as any).toolCalls;
        console.log(`[AUDIT] tool_call_raw:`, JSON.stringify(toolCalls));

        const toolResults: ToolResult[] = [];
        for (const call of toolCalls) {
          const toolResult = await this.executeTool(call.tool, call.args, context);
          console.log(`[AUDIT] tool_result_raw:`, JSON.stringify(toolResult.content));
          toolResults.push(toolResult);
          
          await emitSwarmEvent('tool.call', context, {
            tool: call.tool,
            status: toolResult.status,
            summary: toolResult.summary
          });
        }

        // 2. Inject results and loop back
        currentContext = this.injectToolResults(currentContext, result, toolResults);
        continue;
      }

      // 3. Terminal state reached (handoff, final, clarify) or no tools called
      return result;
    }

    return {
      ok: false,
      content: lastResult?.content || '',
      error: `Max iterations (${this.maxIterations}) exceeded for native tool loop.`
    };
  }

  private async executeTool(name: string, args: any, context: RunContext): Promise<ToolResult> {
    console.log(`[NativeToolLoop] Executing tool: ${name} with args:`, args);

    try {
      const toolResult = await executeViaWorkbench(name, args, context);
      if (toolResult.status === 'queued') {
        return {
          tool: name,
          status: 'failed',
          content: null,
          summary: toolResult.summary,
          error: 'tool_queued',
        };
      }
      if (toolResult.status === 'blocked') {
        return {
          tool: name,
          status: 'failed',
          content: null,
          summary: toolResult.summary,
          error: 'tool_blocked',
        };
      }
      if (toolResult.status === 'failed') {
        return {
          tool: name,
          status: 'failed',
          content: null,
          summary: toolResult.summary,
          error: toolResult.error || 'tool_failed',
        };
      }
      return {
        tool: name,
        status: 'success',
        content: toolResult.content,
        summary: this.summarizeToolContent(toolResult.content, `Successfully called ${name}`),
      };
    } catch (err: any) {
      return {
        tool: name,
        status: 'failed',
        content: null,
        summary: this.summarizeToolContent(err?.message || '', `Failed to call ${name}`),
        error: err.message
      };
    }
  }

  private injectToolResults(context: RunContext, assistantResult: ExecutionResult, results: ToolResult[]): RunContext {
    const newContext = { ...context };
    
    // 1. First, record the model's turn that initiated the tool calls
    newContext.memory.threadHistory.push({
      role: 'assistant',
      content: assistantResult.content,
      tool_calls: (assistantResult as any).toolCalls,
      rawParts: assistantResult.rawParts
    });

    // 2. Then record the observations
    results.forEach(res => {
      newContext.memory.threadHistory.push({
        role: 'observation',
        content: typeof res.content === 'string' ? res.content : JSON.stringify(res.content),
        tool_name: res.tool
      });
    });

    return newContext;
  }
}
