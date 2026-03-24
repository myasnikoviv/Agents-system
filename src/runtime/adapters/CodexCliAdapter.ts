import { ExecutionAdapter, ExecutionResult } from './ExecutionAdapter';
import { RunContext } from '../context/RunContext';
import { SystemPromptGenerator } from '../context/SystemPromptGenerator';
import { runExternalExecutor } from '../ExternalExecutionAdapter';
import { getCockpitExecutorConfig } from '../CockpitExecutorConfig';
import { ExecutionPayload, ExecutionPayloadCompiler } from '../context/ExecutionPayloadCompiler';

export class CodexCliAdapter implements ExecutionAdapter {
  compilePayload(context: RunContext): ExecutionPayload {
    return ExecutionPayloadCompiler.compile(context);
  }

  async execute(context: RunContext): Promise<ExecutionResult> {
    const payload = this.compilePayload(context);
    const cfg = getCockpitExecutorConfig();
    
    const prompt = [
      payload.systemPrompt,
      '',
      'CURRENT USER REQUEST:',
      payload.userPrompt,
    ].join('\n');

    const out = await runExternalExecutor({
      executor: 'codex-cli',
      prompt,
      cwd: process.cwd(),
      timeoutMs: Number(process.env.COCKPIT_EXECUTOR_TIMEOUT_MS || 300000),
      model: cfg.codex.model,
      binaryPath: cfg.codex.bin,
      sandbox: cfg.codex.sandbox
    });

    if (!out.ok) {
      return {
        ok: false,
        content: '',
        error: out.stderr || 'Codex CLI execution failed'
      };
    }

    return {
      ok: true,
      content: (out.stdout || '').trim()
    };
  }
}
