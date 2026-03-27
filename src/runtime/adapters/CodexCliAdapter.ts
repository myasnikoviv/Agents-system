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

    const normalized = raw
      // Some codex builds can print adjacent JSON objects without newlines.
      .replace(/}\s*{/g, '}\n{');
    const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean);
    if (lines.length === 0) return normalized;

    const extractedMessages: string[] = [];
    const extractedToolLogs: string[] = [];

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed?.type === 'item.completed') {
          const item = parsed.item || {};
          if (item?.type === 'agent_message' && typeof item?.text === 'string' && item.text.trim()) {
            extractedMessages.push(item.text.trim());
          }
          continue;
        }

        if (parsed?.type === 'turn.completed') {
          continue;
        }

        if (parsed?.type === 'item.started') {
          const item = parsed.item || {};
          if (item?.type === 'tool_call' && typeof item?.tool_name === 'string') {
            extractedToolLogs.push(`Using tool: ${item.tool_name}`);
          }
          continue;
        }

        if (parsed?.type === 'item.delta') {
          const item = parsed.item || {};
          if (item?.type === 'agent_message' && typeof item?.text_delta === 'string') {
            extractedMessages.push(item.text_delta);
          }
          continue;
        }

        if (typeof parsed?.message === 'string' && parsed.message.trim()) {
          extractedMessages.push(parsed.message.trim());
          continue;
        }

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
      const mergedMessage = extractedMessages.join('').trim();
      if (mergedMessage) return mergedMessage;
      return extractedMessages.join('\n\n').trim();
    }

    if (extractedToolLogs.length > 0) {
      return extractedToolLogs.join('\n');
    }

    return normalized;
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
