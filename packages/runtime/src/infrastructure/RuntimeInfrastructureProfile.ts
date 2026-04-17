export type InfraBackend = 'postgres' | 'redis' | 'memory';

export interface RuntimeInfrastructureProfile {
  secretsBackend: InfraBackend;
  objectStorageBackend: InfraBackend;
  dispatchQueueBackend: InfraBackend;
  sharedWorkerStateBackend: InfraBackend;
  localOnlyMode: boolean;
}

function normalize(value: string | undefined, defaultValue: InfraBackend): InfraBackend {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'postgres' || raw === 'redis' || raw === 'memory') {
    return raw;
  }
  return defaultValue;
}

function isTruthy(value: string | undefined): boolean {
  const raw = String(value || '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

export function resolveRuntimeInfrastructureProfile(env: NodeJS.ProcessEnv = process.env): RuntimeInfrastructureProfile {
  const localOnlyMode = isTruthy(env.RUNTIME_LOCAL_ONLY_MODE);
  const runtimeDefaults = {
    dispatchQueueBackend: 'redis' as InfraBackend,
    sharedWorkerStateBackend: 'redis' as InfraBackend,
  };
  return {
    secretsBackend: normalize(env.COCKPIT_SECRETS_BACKEND, 'postgres'),
    objectStorageBackend: normalize(env.COCKPIT_OBJECT_STORAGE_BACKEND, 'postgres'),
    dispatchQueueBackend: normalize(env.RUNTIME_SHARED_DISPATCH_QUEUE_BACKEND, runtimeDefaults.dispatchQueueBackend),
    sharedWorkerStateBackend: normalize(env.RUNTIME_SHARED_WORKER_STATE_BACKEND, runtimeDefaults.sharedWorkerStateBackend),
    localOnlyMode,
  };
}
