import fs from 'fs';
import path from 'path';
import {
  PostgresControlApiStore,
  PostgresAuthStore,
  PostgresObjectStorageService,
  PostgresSecretsStore,
  PostgresEnvironmentStateStore,
  EnvironmentProvisioningService,
  EnvironmentWarmupService,
  EnvironmentSuspendResumeService,
} from '@system/memory';
import { resolveRuntimeInfrastructureProfile } from '@system/runtime';

export const initializePersistenceLayer = (): any => {
  const SETTINGS_LEGACY_FILE_PATH = path.resolve(process.cwd(), '.agent-system', 'cockpit-settings.json');
  const RUNTIME_STORE_LEGACY_FILE_PATH = path.resolve(process.cwd(), '.agent-system', 'cockpit-runtime-store.json');
  fs.mkdirSync(path.resolve(process.cwd(), '.agent-system'), { recursive: true });

  const postgresObjectStorage = new PostgresObjectStorageService();
  const postgresStore = new PostgresControlApiStore();
  void postgresStore.init();
  const authStore = new PostgresAuthStore({
    query: (sql: string, params?: any[]) => (postgresStore as any).query(sql, params),
  });
  void authStore.ensureSchema();
  const infrastructureProfile = resolveRuntimeInfrastructureProfile();
  const environmentStateStore = new PostgresEnvironmentStateStore({
    query: (sql: string, params?: any[]) => (postgresStore as any).query(sql, params),
  });
  void environmentStateStore.ensureSchema();
  const environmentProvisioningService = new EnvironmentProvisioningService(environmentStateStore as any);
  const environmentWarmupService = new EnvironmentWarmupService(environmentStateStore as any);
  const environmentSuspendResumeService = new EnvironmentSuspendResumeService(environmentStateStore as any);

  const AUTH_SECRET = String(process.env.AUTH_SECRET || 'agent-system-dev-secret');
  const AUTH_MODE = String(process.env.AUTH_MODE || 'optional').trim().toLowerCase() === 'required' ? 'required' : 'optional';
  const OBJECT_STORAGE_BACKEND = String(
    process.env.OBJECT_STORAGE_BACKEND || process.env.COCKPIT_OBJECT_STORAGE_BACKEND || 'postgres',
  ).trim();
  const SECRETS_STORAGE_BACKEND = String(
    process.env.SECRETS_STORAGE_BACKEND || process.env.COCKPIT_SECRETS_BACKEND || 'postgres',
  ).trim();
  const postgresSecretsStore = new PostgresSecretsStore(AUTH_SECRET);
  return {
    SETTINGS_LEGACY_FILE_PATH,
    RUNTIME_STORE_LEGACY_FILE_PATH,
    postgresObjectStorage,
    postgresStore,
    authStore,
    environmentStateStore,
    environmentProvisioningService,
    environmentWarmupService,
    environmentSuspendResumeService,
    AUTH_SECRET,
    AUTH_MODE,
    OBJECT_STORAGE_BACKEND,
    SECRETS_STORAGE_BACKEND,
    postgresSecretsStore,
    infrastructureProfile,
  };
};
