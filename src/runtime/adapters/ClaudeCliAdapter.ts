import { ExecutionAdapter, ExecutionResult } from './ExecutionAdapter';
import { RunContext } from '../context/RunContext';
import { SystemPromptGenerator } from '../context/SystemPromptGenerator';
import { runExternalExecutor } from '../ExternalExecutionAdapter';
import { getCockpitExecutorConfig } from '../CockpitExecutorConfig';
import { ExecutionPayload, ExecutionPayloadCompiler } from '../context/ExecutionPayloadCompiler';

export class ClaudeCliAdapter implements ExecutionAdapter {
  compilePayload(context: RunContext): ExecutionPayload {
    return ExecutionPayloadCompiler.compile(context);
  }

  async execute(context: RunContext): Promise<ExecutionResult> {
    const payload = this.compilePayload(context);
    const cfg = getCockpitExecutorConfig();
    
    // Assemble the full prompt for the CLI
    const prompt = [
      payload.systemPrompt,
      '',
      'CURRENT USER REQUEST:',
      payload.userPrompt,
    ].join('\n');

    const out = await runExternalExecutor({
      executor: 'claude-code',
      prompt,
      cwd: process.cwd(),
      timeoutMs: Number(process.env.COCKPIT_EXECUTOR_TIMEOUT_MS || 300000),
      model: cfg.claude.model,
      binaryPath: cfg.claude.bin,
    });

    if (!out.ok) {
      return {
        ok: false,
        content: '',
        error: out.stderr || 'Claude CLI execution failed'
      };
    }

    return {
      ok: true,
      content: (out.stdout || '').trim()
    };
  }
}
