import crypto from 'crypto';
import { execFile } from 'child_process';
import type { ServiceExecutionAdapter } from './adapters/ServiceExecutionAdapter';

export type DockerServiceStatus = 'idle' | 'running' | 'stopped' | 'failed' | 'unknown';

export interface DockerServiceSpec {
  image: string;
  containerName?: string;
  env?: Record<string, string>;
  ports?: Array<{ host: number; container: number }>;
  command?: string[];
}

export interface DockerServiceRuntime {
  serviceId: string;
  containerName: string;
  containerId: string | null;
  image: string;
  status: DockerServiceStatus;
  health: string | null;
  lastUpdatedAt: string;
}

export interface DockerCommandResult {
  stdout: string;
  stderr: string;
  code: number;
}

type DockerCommandRunner = (args: string[]) => Promise<DockerCommandResult>;

function nowIso(): string {
  return new Date().toISOString();
}

function defaultContainerName(serviceId: string): string {
  const suffix = crypto.createHash('md5').update(serviceId).digest('hex').slice(0, 8);
  return `agent-system-${serviceId}-${suffix}`;
}

function execDocker(args: string[]): Promise<DockerCommandResult> {
  return new Promise((resolve, reject) => {
    execFile('docker', args, { encoding: 'utf-8' }, (error, stdout, stderr) => {
      const code = (error as any)?.code;
      if (error) {
        reject(
          new Error(`docker_command_failed:${args.join(' ')}:code=${String(code ?? 'unknown')}:stderr=${String(stderr || '').trim()}`),
        );
        return;
      }
      resolve({
        stdout: String(stdout || ''),
        stderr: String(stderr || ''),
        code: 0,
      });
    });
  });
}

export class DockerAdapter implements ServiceExecutionAdapter<DockerServiceSpec> {
  readonly adapterId = 'docker';
  private readonly state = new Map<string, DockerServiceRuntime>();
  private readonly runner: DockerCommandRunner;

  constructor(runner?: DockerCommandRunner) {
    this.runner = runner || execDocker;
  }

  getRuntime(serviceId: string): DockerServiceRuntime {
    const found = this.state.get(serviceId);
    if (!found) {
      return {
        serviceId,
        containerName: defaultContainerName(serviceId),
        containerId: null,
        image: '',
        status: 'idle',
        health: null,
        lastUpdatedAt: nowIso(),
      };
    }
    return { ...found };
  }

  async start(serviceId: string, spec: DockerServiceSpec): Promise<DockerServiceRuntime> {
    const containerName = spec.containerName || defaultContainerName(serviceId);
    const args = ['run', '-d', '--name', containerName];

    for (const [k, v] of Object.entries(spec.env || {})) args.push('-e', `${k}=${v}`);
    for (const p of spec.ports || []) args.push('-p', `${p.host}:${p.container}`);
    args.push(spec.image);
    for (const c of spec.command || []) args.push(c);

    // Ensure deterministic isolation per service name before start.
    await this.runner(['rm', '-f', containerName]).catch(() => undefined);
    const run = await this.runner(args);
    const containerId = run.stdout.trim().split('\n').pop() || null;
    const health = await this.readHealth(containerName).catch(() => null);

    const next: DockerServiceRuntime = {
      serviceId,
      containerName,
      containerId,
      image: spec.image,
      status: 'running',
      health,
      lastUpdatedAt: nowIso(),
    };
    this.state.set(serviceId, next);
    return { ...next };
  }

  async stop(serviceId: string): Promise<DockerServiceRuntime> {
    const current = this.getRuntime(serviceId);
    const containerName = current.containerName;
    await this.runner(['stop', containerName]).catch(() => undefined);

    const next: DockerServiceRuntime = {
      ...current,
      status: 'stopped',
      health: null,
      lastUpdatedAt: nowIso(),
    };
    this.state.set(serviceId, next);
    return { ...next };
  }

  async restart(serviceId: string): Promise<DockerServiceRuntime> {
    const current = this.getRuntime(serviceId);
    const containerName = current.containerName;
    await this.runner(['restart', containerName]);
    const health = await this.readHealth(containerName).catch(() => null);

    const next: DockerServiceRuntime = {
      ...current,
      status: 'running',
      health,
      lastUpdatedAt: nowIso(),
    };
    this.state.set(serviceId, next);
    return { ...next };
  }

  async readHealth(containerName: string): Promise<string> {
    const health = await this.runner(['inspect', '--format', '{{json .State.Health.Status}}', containerName]).catch(() => null);
    if (health?.stdout) return health.stdout.trim().replace(/^"|"$/g, '');

    const status = await this.runner(['inspect', '--format', '{{json .State.Status}}', containerName]);
    return status.stdout.trim().replace(/^"|"$/g, '');
  }
}
