import { validateServiceRegistryDefinition } from '../control-api/ServiceRegistryContract';

describe('ServiceRegistry schema v1 (AGSYS-2701)', () => {
  it('accepts valid registry definition', () => {
    const valid = {
      schemaVersion: 'service-registry.v1',
      services: {
        backend: {
          type: 'api',
          runtime: 'node',
          desired: {
            state: 'running',
            restartPolicy: {
              mode: 'on-failure',
              maxRetries: 3,
              backoffMs: 500,
            },
          },
          health: {
            protocol: 'http',
            endpoint: '/api/health',
            intervalMs: 2000,
            timeoutMs: 1000,
            expectedStatus: 200,
          },
        },
        redis: {
          type: 'infra',
          runtime: 'docker',
          desired: 'running',
          metadata: {
            image: 'redis:7-alpine',
          },
        },
      },
    };

    const parsed = validateServiceRegistryDefinition(valid);
    expect(parsed.schemaVersion).toBe('service-registry.v1');
    expect(parsed.services.backend.type).toBe('api');
    expect(parsed.services.backend.desired.state).toBe('running');
    expect(parsed.services.backend.desired.restartPolicy?.mode).toBe('on-failure');
    expect(parsed.services.redis.runtime).toBe('docker');
    expect(parsed.services.redis.desired.state).toBe('running');
  });

  it('rejects invalid service type', () => {
    const invalid = {
      schemaVersion: 'service-registry.v1',
      services: {
        backend: {
          type: 'daemon',
          runtime: 'node',
          desired: 'running',
        },
      },
    };

    expect(() => validateServiceRegistryDefinition(invalid)).toThrow('service_registry_schema_validation_failed');
  });

  it('rejects unknown schemaVersion', () => {
    const invalid = {
      schemaVersion: 'service-registry.v2',
      services: {
        backend: {
          type: 'api',
          runtime: 'node',
          desired: 'running',
        },
      },
    };

    expect(() => validateServiceRegistryDefinition(invalid)).toThrow('service_registry_schema_validation_failed');
  });
});
