import { DockerAdapter } from '../control-plane/DockerAdapter';

describe('DockerAdapter (AGSYS-2708)', () => {
  it('starts container with configurable image and isolation name', async () => {
    const commands: string[][] = [];
    const adapter = new DockerAdapter(async (args) => {
      commands.push(args);
      if (args[0] === 'run') return { stdout: 'container-123\n', stderr: '', code: 0 };
      if (args[0] === 'inspect') return { stdout: '"healthy"\n', stderr: '', code: 0 };
      return { stdout: '', stderr: '', code: 0 };
    });

    const runtime = await adapter.start('redis', {
      image: 'redis:7-alpine',
      containerName: 'svc-redis',
      ports: [{ host: 6379, container: 6379 }],
      env: { ALLOW_EMPTY_PASSWORD: 'yes' },
    });

    expect(runtime.status).toBe('running');
    expect(runtime.image).toBe('redis:7-alpine');
    expect(runtime.containerName).toBe('svc-redis');
    expect(runtime.health).toBe('healthy');

    expect(commands.some((c) => c.join(' ').includes('run -d --name svc-redis'))).toBe(true);
    expect(commands.some((c) => c.join(' ').includes('redis:7-alpine'))).toBe(true);
  });

  it('supports stop and restart lifecycle', async () => {
    const commands: string[][] = [];
    const adapter = new DockerAdapter(async (args) => {
      commands.push(args);
      if (args[0] === 'run') return { stdout: 'container-456\n', stderr: '', code: 0 };
      if (args[0] === 'inspect') return { stdout: '"running"\n', stderr: '', code: 0 };
      return { stdout: '', stderr: '', code: 0 };
    });

    await adapter.start('api', { image: 'node:20-alpine', containerName: 'svc-api' });
    const stopped = await adapter.stop('api');
    expect(stopped.status).toBe('stopped');

    const restarted = await adapter.restart('api');
    expect(restarted.status).toBe('running');
    expect(commands.some((c) => c[0] === 'stop' && c[1] === 'svc-api')).toBe(true);
    expect(commands.some((c) => c[0] === 'restart' && c[1] === 'svc-api')).toBe(true);
  });

  it('reads container health via inspect', async () => {
    const adapter = new DockerAdapter(async (args) => {
      if (args[0] === 'inspect' && args[2] === '{{json .State.Health.Status}}') {
        return { stdout: '"unhealthy"\n', stderr: '', code: 0 };
      }
      return { stdout: '"running"\n', stderr: '', code: 0 };
    });

    const health = await adapter.readHealth('svc-any');
    expect(health).toBe('unhealthy');
  });
});
