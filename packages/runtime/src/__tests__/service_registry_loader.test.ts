import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  loadServiceRegistry,
  watchServiceRegistry,
} from '../control-api/ServiceRegistryLoader';

describe('ServiceRegistryLoader (AGSYS-2702)', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'service-registry-loader-'));

  afterAll(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // no-op
    }
  });

  it('loads valid JSON registry', () => {
    const file = path.join(tmpDir, 'registry.json');
    fs.writeFileSync(
      file,
      JSON.stringify(
        {
          schemaVersion: 'service-registry.v1',
          services: {
            backend: { type: 'api', runtime: 'node', desired: 'running' },
          },
        },
        null,
        2,
      ),
      'utf-8',
    );

    const loaded = loadServiceRegistry(file);
    expect(loaded.registry.services.backend.type).toBe('api');
  });

  it('loads valid YAML registry', () => {
    const file = path.join(tmpDir, 'registry.yaml');
    fs.writeFileSync(
      file,
      [
        'schemaVersion: service-registry.v1',
        'services:',
        '  runtime-dispatcher:',
        '    type: worker',
        '    runtime: node',
        '    desired: running',
      ].join('\n'),
      'utf-8',
    );

    const loaded = loadServiceRegistry(file);
    expect(loaded.registry.services['runtime-dispatcher'].type).toBe('worker');
  });

  it('throws on invalid registry shape', () => {
    const file = path.join(tmpDir, 'invalid.json');
    fs.writeFileSync(
      file,
      JSON.stringify(
        {
          schemaVersion: 'service-registry.v1',
          services: {
            redis: { type: 'unknown', runtime: 'docker', desired: 'running' },
          },
        },
        null,
        2,
      ),
      'utf-8',
    );

    expect(() => loadServiceRegistry(file)).toThrow('service_registry_schema_validation_failed');
  });

  it('supports basic dynamic reload via watch', async () => {
    const file = path.join(tmpDir, 'watch.json');
    fs.writeFileSync(
      file,
      JSON.stringify(
        {
          schemaVersion: 'service-registry.v1',
          services: {
            backend: { type: 'api', runtime: 'node', desired: 'running' },
          },
        },
        null,
        2,
      ),
      'utf-8',
    );

    const seen: string[] = [];
    const handle = watchServiceRegistry(file, (next) => {
      const desired = next.registry.services.backend.desired.state;
      seen.push(desired);
    });

    fs.writeFileSync(
      file,
      JSON.stringify(
        {
          schemaVersion: 'service-registry.v1',
          services: {
            backend: { type: 'api', runtime: 'node', desired: 'stopped' },
          },
        },
        null,
        2,
      ),
      'utf-8',
    );

    const deadline = Date.now() + 2500;
    while (!seen.includes('stopped') && Date.now() < deadline) {
      // fs.watch can be delayed depending on host FS events scheduling.
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    handle.close();

    expect(seen).toContain('stopped');
  });
});
