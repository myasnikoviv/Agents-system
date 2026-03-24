import axios from 'axios';
import { ExternalExecutionInput, ExternalExecutionResult } from './ExternalExecutionAdapter';
import { getCockpitExecutorConfig } from './CockpitExecutorConfig';

export interface OpenHandsConversationResponse {
  conversation_id: string;
  status: string;
}

export class OpenHandsExecutionProvider {
  private serverUrl: string;

  constructor(serverUrl: string) {
    this.serverUrl = serverUrl.replace(/\/$/, '');
  }

  async checkHeartbeat(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.serverUrl}/health`, { timeout: 2000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  private getProviderFromModel(model: string): 'openai' | 'anthropic' | 'google' {
    if (model.startsWith('openai/')) return 'openai';
    if (model.startsWith('anthropic/')) return 'anthropic';
    if (model.startsWith('google/')) return 'google';
    return 'anthropic'; // default fallback
  }

  async runTask(input: ExternalExecutionInput): Promise<ExternalExecutionResult> {
    const startedAt = Date.now();
    try {
      const cfg = getCockpitExecutorConfig();
      const model = input.model || cfg.openhands.model || 'anthropic/claude-sonnet-4-6';
      const provider = this.getProviderFromModel(model);
      // Priority: explicit config apiKeys > provider env var > generic fallback
      const apiKey = cfg.openhands.apiKeys[provider]
        || (provider === 'openai' ? process.env.OPENAI_API_KEY : '')
        || (provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY : '')
        || (provider === 'google' ? process.env.GOOGLE_API_KEY : '')
        || process.env.OPENHANDS_API_KEY
        || '';

      const keyTeaser = apiKey.length > 8 ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : '***';
      console.log(`[OpenHandsExecutionProvider] Running task with provider=${provider}, model=${model}, apiKey=${keyTeaser}`);

      // 1. Create a dynamic conversation
      const convResponse = await axios.post(`${this.serverUrl}/api/conversations`, {
        agent: {
          discriminator: 'Agent',
          llm: {
            model,
            api_key: apiKey,
          },
          tools: [
            { name: 'TerminalTool' },
            { name: 'FileEditorTool' }
          ]
        },
        workspace: {
          working_dir: input.cwd || '/workspace'
        },
        initial_message: {
          role: 'user',
          content: [{ type: 'text', text: input.prompt }],
          run: true
        }
      });

      const conversationId = convResponse.data.conversation_id;

      // 2. Wait for completion (Polling mode for MVP)
      // Note: In real production, we'd use WebSockets for streaming.
      let isRunning = true;
      let status = 'running';
      let attempts = 0;
      const MAX_ATTEMPTS = 60; // 3 minutes timeout (3s * 60)

      while (isRunning && attempts < MAX_ATTEMPTS) {
        attempts++;
        await new Promise(r => setTimeout(r, 3000));
        const statusRes = await axios.get(`${this.serverUrl}/api/conversations/${conversationId}`);
        status = statusRes.data.execution_status;
        if (status !== 'running' && status !== 'pending') {
          isRunning = false;
        }
      }

      // 3. Fetch final events to get the agent's response
      const eventsRes = await axios.get(`${this.serverUrl}/api/conversations/${conversationId}/events/search?limit=10`);
      const events = eventsRes.data.events || [];
      const lastMessage = events.reverse().find((e: any) => e.role === 'assistant');
      
      const stdout = typeof lastMessage?.content === 'string' 
        ? lastMessage.content 
        : JSON.stringify(lastMessage?.content || 'Task completed via OpenHands.');

      return {
        ok: status === 'finished' || status === 'completed',
        executor: 'openhands-sdk' as any,
        stdout,
        stderr: status === 'error' ? 'OpenHands reported execution error' : '',
        exitCode: status === 'finished' ? 0 : -1,
        durationMs: Date.now() - startedAt,
        command: ['openhands', 'run', conversationId]
      };

    } catch (error: any) {
      return {
        ok: false,
        executor: 'openhands-sdk' as any,
        stdout: '',
        stderr: error.response?.data?.message || error.message || 'OpenHands server communication failed',
        exitCode: -1,
        durationMs: Date.now() - startedAt,
        command: []
      };
    }
  }
}
