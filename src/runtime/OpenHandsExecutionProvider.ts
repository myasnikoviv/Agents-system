import axios from 'axios';
import { ExternalExecutionInput, ExternalExecutionResult } from './ExternalExecutionAdapter';
import { getCockpitExecutorConfig } from './CockpitExecutorConfig';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { RunManager } from './context/RunManager';

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
    return 'anthropic'; // default defaultValue
  }

  private parsePositiveInt(value: string | undefined, defaultValue: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return defaultValue;
    return Math.floor(parsed);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private cancellableSleep(ms: number, signal?: AbortSignal): Promise<void> {
    if (!signal) return this.sleep(ms);
    if (signal.aborted) return Promise.reject(new Error('run_cancelled'));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        signal.removeEventListener('abort', onAbort);
        resolve();
      }, ms);
      const onAbort = () => {
        clearTimeout(timer);
        signal.removeEventListener('abort', onAbort);
        reject(new Error('run_cancelled'));
      };
      signal.addEventListener('abort', onAbort, { once: true });
    });
  }

  private throwIfCancelled(runId?: string, signal?: AbortSignal): void {
    if (signal?.aborted) {
      throw new Error(`Run ${String(runId || 'unknown')} was cancelled.`);
    }
    const rid = String(runId || '').trim();
    if (rid) {
      RunManager.checkCancellation(rid);
    }
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

  private writeDiagnostics(traceId: string, event: Record<string, unknown>): void {
    const enabled = String(process.env.OPENHANDS_DIAGNOSTICS_ENABLED || 'true').toLowerCase() !== 'false';
    if (!enabled) return;
    const root = process.env.OPENHANDS_DIAGNOSTICS_DIR
      || path.resolve(process.cwd(), 'docs/process/runs/openhands-diagnostics');
    const day = new Date().toISOString().slice(0, 10);
    const filePath = path.join(root, `trace-${day}.jsonl`);
    const row = JSON.stringify({
      ts: new Date().toISOString(),
      traceId,
      ...event,
    });
    try {
      fs.mkdirSync(root, { recursive: true });
      fs.appendFileSync(filePath, `${row}\n`, 'utf-8');
    } catch {
      // Do not fail execution because of diagnostics write issues.
    }
  }

  async runTask(input: ExternalExecutionInput): Promise<ExternalExecutionResult> {
    const startedAt = Date.now();
    const traceId = randomUUID();
    const runId = String(input.runId || '').trim();
    const abortSignal = (runId ? RunManager.getAbortSignal(runId) : undefined) || undefined;
    const cfg = getCockpitExecutorConfig();
    const model = input.model || cfg.openhands.model || 'anthropic/claude-sonnet-4-6';
    const provider = this.getProviderFromModel(model);
    const apiKey = cfg.openhands.apiKeys[provider]
      || (provider === 'openai' ? process.env.OPENAI_API_KEY : '')
      || (provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY : '')
      || (provider === 'google' ? process.env.GOOGLE_API_KEY : '')
      || process.env.OPENHANDS_API_KEY
      || '';

    const requestedTimeoutMs = this.parsePositiveInt(
      String(input.timeoutMs || process.env.COCKPIT_EXECUTOR_TIMEOUT_MS || ''),
      45000,
    );
    const maxRunRetries = this.parsePositiveInt(process.env.OPENHANDS_RETRY_MAX_ATTEMPTS, 2);
    const backoffBaseMs = this.parsePositiveInt(process.env.OPENHANDS_RETRY_BASE_MS, 1500);
    const backoffMaxMs = this.parsePositiveInt(process.env.OPENHANDS_RETRY_MAX_BACKOFF_MS, 15000);
    const pollIntervalMs = this.parsePositiveInt(process.env.OPENHANDS_POLL_INTERVAL_MS, 2000);
    const defaultMaxPollAttempts = Math.max(4, Math.floor(requestedTimeoutMs / pollIntervalMs));
    const maxPollAttempts = this.parsePositiveInt(
      process.env.OPENHANDS_MAX_POLL_ATTEMPTS,
      defaultMaxPollAttempts,
    );
    const requestTimeoutMs = this.parsePositiveInt(process.env.OPENHANDS_REQUEST_TIMEOUT_MS, 10000);
    const promptChars = String(input.prompt || '').length;
    const approxPromptTokens = Math.ceil(promptChars / 4);
    this.writeDiagnostics(traceId, {
      phase: 'start',
      provider,
      model,
      serverUrl: this.serverUrl,
      timeoutMs: requestedTimeoutMs,
      requestTimeoutMs,
      pollIntervalMs,
      maxPollAttempts,
      retries: maxRunRetries,
      promptChars,
      approxPromptTokens,
      cwd: input.cwd || process.cwd(),
    });

    const keyTeaser = apiKey.length > 8 ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : '***';
    console.log(`[OpenHandsExecutionProvider] Running task with provider=${provider}, model=${model}, apiKey=${keyTeaser}, retries=${maxRunRetries}`);

    let lastError = 'OpenHands execution failed';
    let lastConversationId = '';
    for (let runAttempt = 1; runAttempt <= maxRunRetries; runAttempt++) {
      this.writeDiagnostics(traceId, { phase: 'attempt_start', runAttempt });
      try {
        this.throwIfCancelled(runId, abortSignal);
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
        }, { timeout: requestTimeoutMs, signal: abortSignal });

        const conversationId = String(convResponse.data?.conversation_id || '').trim();
        lastConversationId = conversationId;
        this.writeDiagnostics(traceId, {
          phase: 'conversation_created',
          runAttempt,
          conversationId,
          httpStatus: convResponse.status,
        });

        let isRunning = true;
        let status = 'running';
        let previousStatus = '';
        let statusAttempts = 0;
        let latestStatusPayload: any = null;

        while (isRunning && statusAttempts < maxPollAttempts) {
          statusAttempts++;
          await this.cancellableSleep(pollIntervalMs, abortSignal);
          this.throwIfCancelled(runId, abortSignal);
          const statusRes = await axios.get(`${this.serverUrl}/api/conversations/${conversationId}`, { timeout: requestTimeoutMs, signal: abortSignal });
          latestStatusPayload = statusRes.data;
          status = String(statusRes.data?.execution_status || '').trim() || 'unknown';
          if (status !== previousStatus || statusAttempts === 1 || statusAttempts % 10 === 0) {
            this.writeDiagnostics(traceId, {
              phase: 'status_poll',
              runAttempt,
              conversationId,
              status,
              statusAttempts,
              httpStatus: statusRes.status,
            });
            previousStatus = status;
          }
          if (status !== 'running' && status !== 'pending') {
            isRunning = false;
          }
        }

        if (isRunning) {
          status = 'timeout';
        }

        this.throwIfCancelled(runId, abortSignal);
        const eventsRes = await axios.get(`${this.serverUrl}/api/conversations/${conversationId}/events/search?limit=50`, { timeout: requestTimeoutMs, signal: abortSignal });
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
          this.writeDiagnostics(traceId, {
            phase: 'attempt_success',
            runAttempt,
            conversationId,
            status,
            statusAttempts,
            eventsCount: events.length,
            durationMs: Date.now() - startedAt,
          });
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
        this.writeDiagnostics(traceId, {
          phase: 'attempt_failed',
          runAttempt,
          conversationId,
          status,
          statusAttempts,
          eventsCount: events.length,
          error: combinedError,
        });
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
        this.writeDiagnostics(traceId, {
          phase: 'retry_scheduled',
          runAttempt,
          delayMs,
          error: combinedError,
        });
        await this.sleep(delayMs);
      } catch (error: any) {
        if (abortSignal?.aborted || String(error?.message || '').toLowerCase().includes('cancelled')) {
          return {
            ok: false,
            executor: 'openhands-sdk',
            stdout: '',
            stderr: `run_cancelled:${runId || 'unknown'}`,
            exitCode: 130,
            durationMs: Date.now() - startedAt,
            command: lastConversationId ? ['openhands', 'run', lastConversationId] : []
          };
        }
        const statusCode = Number(error?.response?.status);
        const errMsg =
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          'OpenHands server communication failed';
        lastError = String(errMsg);
        this.writeDiagnostics(traceId, {
          phase: 'attempt_exception',
          runAttempt,
          statusCode: Number.isFinite(statusCode) ? statusCode : null,
          error: lastError,
          conversationId: lastConversationId || null,
        });
        const retry = runAttempt < maxRunRetries && this.shouldRetry(lastError, Number.isFinite(statusCode) ? statusCode : undefined);
        if (!retry) {
          this.writeDiagnostics(traceId, {
            phase: 'attempt_exception_final',
            runAttempt,
            error: lastError,
            durationMs: Date.now() - startedAt,
          });
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
        this.writeDiagnostics(traceId, {
          phase: 'retry_scheduled_exception',
          runAttempt,
          delayMs,
          statusCode: Number.isFinite(statusCode) ? statusCode : null,
          error: lastError,
        });
        await this.sleep(delayMs);
      }
    }

    this.writeDiagnostics(traceId, {
      phase: 'final_failure',
      error: lastError,
      conversationId: lastConversationId || null,
      durationMs: Date.now() - startedAt,
    });
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
