import { ExecutionAdapter, ExecutionResult } from './ExecutionAdapter';
import { RunContext } from '../context/RunContext';
import { SystemPromptGenerator } from '../context/SystemPromptGenerator';
import { ExecutionPayload, ExecutionPayloadCompiler } from '../context/ExecutionPayloadCompiler';
import axios from 'axios';
import { runExternalExecutor } from '../ExternalExecutionAdapter';
import { getCockpitExecutorConfig } from '../CockpitExecutorConfig';

export class OpenHandsAdapter implements ExecutionAdapter {
  compilePayload(context: RunContext): ExecutionPayload {
    return ExecutionPayloadCompiler.compile(context);
  }

  async execute(context: RunContext): Promise<ExecutionResult> {
    const payload = this.compilePayload(context);
    const cfg = getCockpitExecutorConfig();
    
    // OpenHands expects a prompt or a set of instructions
    const prompt = [
      payload.systemPrompt,
      '',
      'USER REQUEST:',
      payload.userPrompt
    ].join('\n');

    const out = await runExternalExecutor({
      executor: 'openhands-sdk',
      prompt,
      cwd: context.workspacePath || process.cwd(),
      model: cfg.openhands.model,
    });

    if (!out.ok) {
      return {
        ok: false,
        content: '',
        error: out.stderr || 'OpenHands execution failed'
      };
    }

    return {
      ok: true,
      content: (out.stdout || '').trim()
    };
  }
}
