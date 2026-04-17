import { resolveRuntimeInfrastructureProfile } from '../infrastructure/RuntimeInfrastructureProfile';

describe('RuntimeInfrastructureProfile', () => {
  it('resolves backends from env in config-driven way', () => {
    const profile = resolveRuntimeInfrastructureProfile({
      COCKPIT_SECRETS_BACKEND: 'postgres',
      COCKPIT_OBJECT_STORAGE_BACKEND: 'postgres',
      RUNTIME_SHARED_DISPATCH_QUEUE_BACKEND: 'redis',
      RUNTIME_SHARED_WORKER_STATE_BACKEND: 'redis',
    } as any);
    expect(profile.secretsBackend).toBe('postgres');
    expect(profile.objectStorageBackend).toBe('postgres');
    expect(profile.dispatchQueueBackend).toBe('redis');
    expect(profile.sharedWorkerStateBackend).toBe('redis');
  });

  it('falls back to postgres/redis for unknown values', () => {
    const profile = resolveRuntimeInfrastructureProfile({
      COCKPIT_SECRETS_BACKEND: 'nope',
      COCKPIT_OBJECT_STORAGE_BACKEND: '',
      RUNTIME_SHARED_DISPATCH_QUEUE_BACKEND: 'x',
      RUNTIME_SHARED_WORKER_STATE_BACKEND: 'y',
    } as any);
    expect(profile.secretsBackend).toBe('postgres');
    expect(profile.objectStorageBackend).toBe('postgres');
    expect(profile.dispatchQueueBackend).toBe('redis');
    expect(profile.sharedWorkerStateBackend).toBe('redis');
    expect(profile.localOnlyMode).toBe(false);
  });

  it('uses distributed runtime defaults when env is not set', () => {
    const profile = resolveRuntimeInfrastructureProfile({} as any);
    expect(profile.dispatchQueueBackend).toBe('redis');
    expect(profile.sharedWorkerStateBackend).toBe('redis');
    expect(profile.localOnlyMode).toBe(false);
  });

  it('keeps distributed defaults in local-only mode for shared backends', () => {
    const profile = resolveRuntimeInfrastructureProfile({
      RUNTIME_LOCAL_ONLY_MODE: 'true',
    } as any);
    expect(profile.dispatchQueueBackend).toBe('redis');
    expect(profile.sharedWorkerStateBackend).toBe('redis');
    expect(profile.localOnlyMode).toBe(true);
  });
});
