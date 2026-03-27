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

  private parsePositiveInt(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.floor(parsed);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private shouldRetry(errorText: string, statusCode?: number): boolean {
    const text = String(errorText || '').toLowerCase();
    if (statusCode === 408 || statusCode === 409 || statusCode === 425 || statusCode === 429) return true;
    if (typeof statusCode === 'number' && statusCode >= 500) return true;

    return [
      'busy',
      'overload',
      'temporarily unavailable',
      'timeout',
      'timed out',
      'rate limit',
      'too many requests',
      'connection reset',
      'econnrefused',
      'econnreset',
      'network error',
      'service unavailable',
    ].some((needle) => text.includes(needle));
  }

  private backoffDelayMs(attempt: number, baseMs: number, maxMs: number): number {
    const exp = Math.min(maxMs, baseMs * (2 ** Math.max(0, attempt - 1)));
    const jitter = Math.floor(Math.random() * Math.max(100, Math.floor(exp * 0.2)));
    return Math.min(maxMs, exp + jitter);
  }

  private stringifyUnknown(value: unknown): string {
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value ?? '');
    }
  }

  private extractErrorTextFromEvent(event: any): string {
    if (!event) return '';
    const candidates: string[] = [];

    if (typeof event?.content === 'string') candidates.push(event.content);
    if (typeof event?.message === 'string') candidates.push(event.message);
    if (typeof event?.error === 'string') candidates.push(event.error);
    if (typeof event?.details === 'string') candidates.push(event.details);

    if (event?.content && typeof event.content !== 'string') {
      candidates.push(this.stringifyUnknown(event.content));
    }
    if (event?.error && typeof event.error !== 'string') {
      candidates.push(this.stringifyUnknown(event.error));
    }
    if (event?.metadata) {
      candidates.push(this.stringifyUnknown(event.metadata));
    }

    return candidates
      .map((c) => String(c || '').trim())
      .find((c) =>
        c.length > 0 &&
        (
          c.toLowerCase().includes('error') ||
          c.toLowerCase().includes('failed') ||
          c.toLowerCase().includes('resource_exhausted') ||
          c.toLowerCase().includes('quota') ||
          c.toLowerCase().includes('429')
        )
      ) || '';
  }

  async runTask(input: ExternalExecutionInput): Promise<ExternalExecutionResult> {
    const startedAt = Date.now();
    const cfg = getCockpitExecutorConfig();
    const model = input.model || cfg.openhands.model || 'anthropic/claude-sonnet-4-6';
    const provider = this.getProviderFromModel(model);
    const apiKey = cfg.openhands.apiKeys[provider]
      || (provider === 'openai' ? process.env.OPENAI_API_KEY : '')
      || (provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY : '')
      || (provider === 'google' ? process.env.GOOGLE_API_KEY : '')
      || process.env.OPENHANDS_API_KEY
      || '';

    const maxRunRetries = this.parsePositiveInt(process.env.OPENHANDS_RETRY_MAX_ATTEMPTS, 4);
    const backoffBaseMs = this.parsePositiveInt(process.env.OPENHANDS_RETRY_BASE_MS, 1500);
    const backoffMaxMs = this.parsePositiveInt(process.env.OPENHANDS_RETRY_MAX_BACKOFF_MS, 15000);
    const pollIntervalMs = this.parsePositiveInt(process.env.OPENHANDS_POLL_INTERVAL_MS, 3000);
    const maxPollAttempts = this.parsePositiveInt(process.env.OPENHANDS_MAX_POLL_ATTEMPTS, 60);
    const requestTimeoutMs = this.parsePositiveInt(process.env.OPENHANDS_REQUEST_TIMEOUT_MS, 15000);

    const keyTeaser = apiKey.length > 8 ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : '***';
    console.log(`[OpenHandsExecutionProvider] Running task with provider=${provider}, model=${model}, apiKey=${keyTeaser}, retries=${maxRunRetries}`);

    let lastError = 'OpenHands execution failed';
    let lastConversationId = '';
    for (let runAttempt = 1; runAttempt <= maxRunRetries; runAttempt++) {
      try {
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
        }, { timeout: requestTimeoutMs });

        const conversationId = String(convResponse.data?.conversation_id || '').trim();
        lastConversationId = conversationId;

        let isRunning = true;
        let status = 'running';
        let statusAttempts = 0;
        let latestStatusPayload: any = null;

        while (isRunning && statusAttempts < maxPollAttempts) {
          statusAttempts++;
          await this.sleep(pollIntervalMs);
          const statusRes = await axios.get(`${this.serverUrl}/api/conversations/${conversationId}`, { timeout: requestTimeoutMs });
          latestStatusPayload = statusRes.data;
          status = String(statusRes.data?.execution_status || '').trim() || 'unknown';
          if (status !== 'running' && status !== 'pending') {
            isRunning = false;
          }
        }

        if (isRunning) {
          status = 'timeout';
        }

        const eventsRes = await axios.get(`${this.serverUrl}/api/conversations/${conversationId}/events/search?limit=50`, { timeout: requestTimeoutMs });
        const events = Array.isArray(eventsRes.data?.events) ? eventsRes.data.events : [];
        const reversedEvents = [...events].reverse();
        const lastMessage = reversedEvents.find((e: any) => e.role === 'assistant');
        const lastErrorEvent = reversedEvents.find((e: any) =>
          String(e?.role || '').toLowerCase() === 'system' ||
          String(e?.type || '').toLowerCase().includes('error') ||
          String(e?.status || '').toLowerCase() === 'error',
        );
        const assistantSidecarError = reversedEvents.find((e: any) => {
          const text = this.extractErrorTextFromEvent(e).toLowerCase();
          return (
            String(e?.role || '').toLowerCase() === 'assistant' &&
            (text.includes('[sidecar error]') || text.includes('llm call failed'))
          );
        });
        const statusErrorText = [
          this.extractErrorTextFromEvent(lastErrorEvent),
          this.extractErrorTextFromEvent(assistantSidecarError),
          this.extractErrorTextFromEvent(latestStatusPayload),
        ].find((item) => String(item || '').trim().length > 0) || '';

        const stdout = typeof lastMessage?.content === 'string'
          ? lastMessage.content
          : JSON.stringify(lastMessage?.content || 'Task completed via OpenHands.');

        const ok = status === 'finished' || status === 'completed';
        if (ok) {
          return {
            ok: true,
            executor: 'openhands-sdk' as any,
            stdout,
            stderr: '',
            exitCode: 0,
            durationMs: Date.now() - startedAt,
            command: ['openhands', 'run', conversationId]
          };
        }

        const statusFailureText = status === 'timeout'
          ? `OpenHands timed out after ${maxPollAttempts} polls`
          : `OpenHands reported execution status=${status}`;
        const combinedError = `${statusFailureText}${statusErrorText ? ` | details=${statusErrorText}` : ''}`;
        lastError = combinedError;
        const emptyErrorStatus = status === 'error' && !String(statusErrorText || '').trim();
        const retryableErrorStatus = status === 'error' || status === 'failed';
        const retry =
          runAttempt < maxRunRetries &&
          (emptyErrorStatus || retryableErrorStatus || this.shouldRetry(combinedError));
        if (!retry) {
          return {
            ok: false,
            executor: 'openhands-sdk' as any,
            stdout,
            stderr: combinedError,
            exitCode: -1,
            durationMs: Date.now() - startedAt,
            command: ['openhands', 'run', conversationId]
          };
        }

        const delayMs = this.backoffDelayMs(runAttempt, backoffBaseMs, backoffMaxMs);
        console.warn(`[OpenHandsExecutionProvider] attempt ${runAttempt}/${maxRunRetries} failed; retrying in ${delayMs}ms: ${combinedError}`);
        await this.sleep(delayMs);
      } catch (error: any) {
        const statusCode = Number(error?.response?.status);
        const errMsg =
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          'OpenHands server communication failed';
        lastError = String(errMsg);
        const retry = runAttempt < maxRunRetries && this.shouldRetry(lastError, Number.isFinite(statusCode) ? statusCode : undefined);
        if (!retry) {
          return {
            ok: false,
            executor: 'openhands-sdk' as any,
            stdout: '',
            stderr: lastError,
            exitCode: -1,
            durationMs: Date.now() - startedAt,
            command: lastConversationId ? ['openhands', 'run', lastConversationId] : []
          };
        }
        const delayMs = this.backoffDelayMs(runAttempt, backoffBaseMs, backoffMaxMs);
        console.warn(`[OpenHandsExecutionProvider] attempt ${runAttempt}/${maxRunRetries} transport error; retrying in ${delayMs}ms (status=${statusCode || 'n/a'}): ${lastError}`);
        await this.sleep(delayMs);
      }
    }

    return {
      ok: false,
      executor: 'openhands-sdk' as any,
      stdout: '',
      stderr: lastError,
      exitCode: -1,
      durationMs: Date.now() - startedAt,
      command: lastConversationId ? ['openhands', 'run', lastConversationId] : []
    };
  }
}
