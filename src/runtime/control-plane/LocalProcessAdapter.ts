import fs from 'fs';
import path from 'path';
import { ChildProcess, spawn } from 'child_process';
import type { ServiceExecutionAdapter } from './adapters/ServiceExecutionAdapter';

export type LocalServiceStatus = 'idle' | 'running' | 'stopped' | 'crashed';

export interface LocalProcessServiceSpec {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  logDir?: string;
}

export interface LocalProcessRuntime {
  serviceId: string;
  pid: number | null;
  status: LocalServiceStatus;
  startedAt: string | null;
  stoppedAt: string | null;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  crashReason: string | null;
}

interface TrackedProcess {
  child: ChildProcess;
  spec: LocalProcessServiceSpec;
  runtime: LocalProcessRuntime;
  stopping: boolean;
}

function nowIso(): string {
  return new Date().toISOString();
}

export class LocalProcessAdapter implements ServiceExecutionAdapter<LocalProcessServiceSpec> {
  readonly adapterId = 'local-process';
  private readonly services = new Map<string, TrackedProcess>();

  getRuntime(serviceId: string): LocalProcessRuntime {
    const found = this.services.get(serviceId);
    if (!found) {
      return {
        serviceId,
        pid: null,
        status: 'idle',
        startedAt: null,
        stoppedAt: null,
        exitCode: null,
        signal: null,
        crashReason: null,
      };
    }
    return { ...found.runtime };
  }

  isRunning(serviceId: string): boolean {
    const runtime = this.getRuntime(serviceId);
    return runtime.status === 'running' && !!runtime.pid;
  }

  async start(serviceId: string, spec: LocalProcessServiceSpec): Promise<LocalProcessRuntime> {
    const existing = this.services.get(serviceId);
    if (existing?.runtime.status === 'running') {
      return { ...existing.runtime };
    }

    const child = spawn(spec.command, spec.args || [], {
      cwd: spec.cwd,
      env: { ...process.env, ...(spec.env || {}) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const runtime: LocalProcessRuntime = {
      serviceId,
      pid: child.pid || null,
      status: 'running',
      startedAt: nowIso(),
      stoppedAt: null,
      exitCode: null,
      signal: null,
      crashReason: null,
    };

    const tracked: TrackedProcess = {
      child,
      spec,
      runtime,
      stopping: false,
    };

    const logStream = this.createLogStream(serviceId, spec.logDir);
    if (child.stdout) {
      child.stdout.on('data', (chunk) => {
        if (logStream) logStream.write(`[stdout] ${String(chunk)}`);
      });
    }
    if (child.stderr) {
      child.stderr.on('data', (chunk) => {
        if (logStream) logStream.write(`[stderr] ${String(chunk)}`);
      });
    }

    child.on('exit', (code, signal) => {
      const row = this.services.get(serviceId);
      if (!row) return;
      row.runtime.pid = null;
      row.runtime.exitCode = typeof code === 'number' ? code : null;
      row.runtime.signal = (signal as NodeJS.Signals | null) || null;
      row.runtime.stoppedAt = nowIso();

      const crashed = !row.stopping && (code !== 0 || !!signal);
      row.runtime.status = crashed ? 'crashed' : 'stopped';
      row.runtime.crashReason = crashed
        ? `process_exited_unexpectedly:code=${code ?? 'null'};signal=${signal ?? 'null'}`
        : null;

      if (logStream) {
        logStream.write(`\n[meta] exit code=${code ?? 'null'} signal=${signal ?? 'null'} crashed=${crashed}\n`);
        logStream.end();
      }
    });

    this.services.set(serviceId, tracked);
    return { ...runtime };
  }

  async stop(serviceId: string, options?: { signal?: NodeJS.Signals; timeoutMs?: number }): Promise<LocalProcessRuntime> {
    const row = this.services.get(serviceId);
    if (!row || !row.child.pid || row.runtime.status !== 'running') {
      const runtime = this.getRuntime(serviceId);
      return {
        ...runtime,
        status: runtime.status === 'idle' ? 'stopped' : runtime.status,
      };
    }

    const signal = options?.signal || 'SIGTERM';
    const timeoutMs = Math.max(100, Number(options?.timeoutMs || 3000));
    row.stopping = true;
    row.child.kill(signal);

    await this.waitForExit(row.child, timeoutMs).catch(() => {
      if (row.child.pid) row.child.kill('SIGKILL');
    });

    return this.getRuntime(serviceId);
  }

  async restart(serviceId: string, specOverride?: Partial<LocalProcessServiceSpec>): Promise<LocalProcessRuntime> {
    const current = this.services.get(serviceId);
    const spec = {
      ...(current?.spec || {}),
      ...(specOverride || {}),
    } as LocalProcessServiceSpec;

    if (!spec.command) {
      throw new Error(`local_process_adapter_restart_missing_spec:${serviceId}`);
    }

    await this.stop(serviceId);
    return this.start(serviceId, spec);
  }

  private waitForExit(child: ChildProcess, timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      let done = false;
      const finish = (err?: Error) => {
        if (done) return;
        done = true;
        if (err) reject(err);
        else resolve();
      };

      const timer = setTimeout(() => finish(new Error('local_process_stop_timeout')), timeoutMs);
      child.once('exit', () => {
        clearTimeout(timer);
        finish();
      });
    });
  }

  private createLogStream(serviceId: string, logDir?: string): fs.WriteStream | null {
    if (!logDir) return null;
    const resolved = path.resolve(logDir);
    fs.mkdirSync(resolved, { recursive: true });
    const file = path.join(resolved, `${serviceId}.log`);
    return fs.createWriteStream(file, { flags: 'a' });
  }
}
