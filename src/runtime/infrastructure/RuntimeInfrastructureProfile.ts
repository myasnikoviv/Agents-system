export type InfraBackend = 'sqlite' | 'postgres' | 'redis' | 'memory';

export interface RuntimeInfrastructureProfile {
  secretsBackend: InfraBackend;
  objectStorageBackend: InfraBackend;
  dispatchQueueBackend: InfraBackend;
  sharedWorkerStateBackend: InfraBackend;
}

function normalize(value: string | undefined, fallback: InfraBackend): InfraBackend {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'postgres' || raw === 'redis' || raw === 'memory' || raw === 'sqlite') {
    return raw;
  }
  return fallback;
}

export function resolveRuntimeInfrastructureProfile(env: NodeJS.ProcessEnv = process.env): RuntimeInfrastructureProfile {
  return {
    secretsBackend: normalize(env.COCKPIT_SECRETS_BACKEND, 'sqlite'),
    objectStorageBackend: normalize(env.COCKPIT_OBJECT_STORAGE_BACKEND, 'sqlite'),
    dispatchQueueBackend: normalize(env.RUNTIME_SHARED_DISPATCH_QUEUE_BACKEND, 'sqlite'),
    sharedWorkerStateBackend: normalize(env.RUNTIME_SHARED_WORKER_STATE_BACKEND, 'sqlite'),
  };
}
