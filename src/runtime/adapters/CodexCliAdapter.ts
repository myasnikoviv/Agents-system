import { ExecutionAdapter, ExecutionResult } from './ExecutionAdapter';
import { RunContext } from '../context/RunContext';
import { SystemPromptGenerator } from '../context/SystemPromptGenerator';
import { runExternalExecutor } from '../ExternalExecutionAdapter';
import { getCockpitExecutorConfig } from '../CockpitExecutorConfig';
import { ExecutionPayload, ExecutionPayloadCompiler } from '../context/ExecutionPayloadCompiler';

export class CodexCliAdapter implements ExecutionAdapter {
  private parseCodexJsonOutput(stdout: string): string {
    const raw = String(stdout || '').trim();
    if (!raw) return '';

    const lines = raw.split('\n').map((line) => line.trim()).filter(Boolean);
    if (lines.length === 0) return raw;

    const extractedMessages: string[] = [];

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed?.type === 'item.completed') {
          const item = parsed.item || {};
          if (item?.type === 'agent_message' && typeof item?.text === 'string' && item.text.trim()) {
            extractedMessages.push(item.text.trim());
          }
        }
      } catch {
        // Keep going; codex can mix text/JSON output depending on mode/version.
      }
    }

    if (extractedMessages.length > 0) {
      return extractedMessages.join('\n\n').trim();
    }

    return raw;
  }

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
      content: this.parseCodexJsonOutput(out.stdout || '')
    };
  }
}
