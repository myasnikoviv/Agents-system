import { validateServiceRegistryDefinition } from '../control-plane/ServiceRegistryContract';

describe('Desired state model (AGSYS-2706)', () => {
  it('normalizes legacy desired string to desired.state', () => {
    const parsed = validateServiceRegistryDefinition({
      schemaVersion: 'service-registry.v1',
      services: {
        backend: {
          type: 'api',
          runtime: 'node',
          desired: 'running',
        },
      },
    });

    expect(parsed.services.backend.desired.state).toBe('running');
  });

  it('supports explicit desired model with restart policy', () => {
    const parsed = validateServiceRegistryDefinition({
      schemaVersion: 'service-registry.v1',
      services: {
        worker: {
          type: 'worker',
          runtime: 'node',
          desired: {
            state: 'stopped',
            restartPolicy: {
              mode: 'always',
              maxRetries: 10,
              backoffMs: 250,
            },
            customRule: 'nightly-window',
          },
        },
      },
    });

    expect(parsed.services.worker.desired.state).toBe('stopped');
    expect(parsed.services.worker.desired.restartPolicy?.mode).toBe('always');
    expect(parsed.services.worker.desired.customRule).toBe('nightly-window');
  });
});
