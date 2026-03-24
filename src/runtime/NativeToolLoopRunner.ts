import { RunContext } from './context/RunContext';
import { ExecutionAdapter, ExecutionResult } from './adapters/ExecutionAdapter';
import { emitSwarmEvent } from './events/EventBus';
import { ToolExecutor } from './ToolExecutor';

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

  async run(context: RunContext): Promise<ExecutionResult> {
    let iteration = 0;
    let currentContext = { ...context };
    let lastResult: ExecutionResult | null = null;

    while (iteration < this.maxIterations) {
      iteration++;
      
      console.log(`[NativeToolLoop] Starting iteration ${iteration}/${this.maxIterations} for role ${context.agent.slug}`);
      
      const result = await this.adapter.execute(currentContext);
      lastResult = result;

      console.log(`[AUDIT] model_step_${iteration}_raw:`, JSON.stringify(result.content || ""));

      if (!result.ok) {
        return result;
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
          
          await emitSwarmEvent('tool.called', context, {
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
    
    // This is where the actual tool execution logic goes.
    // For now, we'll map common tools to their implementation or return a stub.
    try {
      const toolResult = await ToolExecutor.execute(name, args, context);
      return {
        tool: name,
        status: 'success',
        content: toolResult,
        summary: `Successfully called ${name}`
      };
    } catch (err: any) {
      return {
        tool: name,
        status: 'failed',
        content: null,
        summary: `Failed to call ${name}`,
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
