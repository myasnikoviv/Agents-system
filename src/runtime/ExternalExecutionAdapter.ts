import { spawn } from 'child_process';
import { getCockpitExecutorConfig } from './CockpitExecutorConfig';
import { OpenHandsExecutionProvider } from './OpenHandsExecutionProvider';

export type ExternalExecutorId = 'claude-code' | 'codex-cli' | 'openhands-sdk';

export interface ExternalExecutionInput {
  executor: ExternalExecutorId;
  prompt: string;
  cwd?: string;
  timeoutMs?: number;
  model?: string;
  binaryPath?: string;
  sandbox?: 'read-only' | 'workspace-write' | 'danger-full-access';
}

export interface ExternalExecutionResult {
  ok: boolean;
  executor: ExternalExecutorId;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  command: string[];
}

function runProcess(command: string, args: string[], cwd: string, timeoutMs: number, customEnv?: NodeJS.ProcessEnv): Promise<ExternalExecutionResult> {
  const startedAt = Date.now();
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: customEnv || process.env,
    });

    let stdout = '';
    let stderr = '';
    let finished = false;

    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      child.kill('SIGKILL');
      resolve({
        ok: false,
        executor: 'claude-code',
        stdout,
        stderr: `${stderr}\n[timeout] process exceeded ${timeoutMs}ms`,
        exitCode: -1,
        durationMs: Date.now() - startedAt,
        command: [command, ...args],
      });
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk || '');
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk || '');
    });

    child.on('error', (err) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve({
        ok: false,
        executor: 'claude-code',
        stdout,
        stderr: `${stderr}\n${String(err?.message || err)}`,
        exitCode: -1,
        durationMs: Date.now() - startedAt,
        command: [command, ...args],
      });
    });

    child.on('close', (code) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      const exitCode = Number.isFinite(code as number) ? Number(code) : -1;
      resolve({
        ok: exitCode === 0,
        executor: 'claude-code',
        stdout,
        stderr,
        exitCode,
        durationMs: Date.now() - startedAt,
        command: [command, ...args],
      });
    });
  });
}

export async function runExternalExecutor(input: ExternalExecutionInput): Promise<ExternalExecutionResult> {
  const cwd = input.cwd || process.cwd();
  const timeoutMs = input.timeoutMs || Number(process.env.COCKPIT_EXECUTOR_TIMEOUT_MS || 180000);
  const cfg = getCockpitExecutorConfig();

  if (input.executor === 'openhands-sdk') {
    const provider = new OpenHandsExecutionProvider(cfg.openhands.serverUrl);
    return await provider.runTask({
      ...input,
      model: input.model || cfg.openhands.model,
      cwd: input.cwd || cfg.openhands.workspacePath
    });
  }

  if (input.executor === 'claude-code') {
    const cliBin = String(input.binaryPath || process.env.CLAUDE_CLI_BIN || 'claude').trim() || 'claude';
    const modelRaw = String(input.model || process.env.CLAUDE_CODE_MODEL || '').trim();
    const model = modelRaw.toLowerCase() === 'auto' ? '' : modelRaw;
    const args = ['-p', input.prompt];
    if (model) {
      args.push('--model', model);
    }
    const out = await runProcess(cliBin, args, cwd, timeoutMs);
    return { ...out, executor: 'claude-code' };
  }

  if (input.executor === 'codex-cli') {
    const cliBin = String(input.binaryPath || process.env.CODEX_CLI_BIN || 'codex').trim() || 'codex';
    const modelRaw = String(input.model || process.env.CODEX_MODEL || '').trim();
    const model = modelRaw.toLowerCase() === 'auto' ? '' : modelRaw;
    const sandbox = input.sandbox || 'workspace-write';
    const args = ['exec', '--json', '--skip-git-repo-check', '--sandbox', sandbox, '--cd', cwd];
    if (model) {
      args.push('--model', model);
    }
    args.push(input.prompt);
    const envOverrides = { ...process.env, SHELL: '/bin/sh' };
    const out = await runProcess(cliBin, args, cwd, timeoutMs, envOverrides);
    return { ...out, executor: 'codex-cli' };
  }

  return {
    ok: false,
    executor: input.executor,
    stdout: '',
    stderr: `unsupported_executor:${input.executor}`,
    exitCode: -1,
    durationMs: 0,
    command: [],
  };
}
