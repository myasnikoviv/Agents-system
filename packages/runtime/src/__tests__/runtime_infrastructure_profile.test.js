"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const RuntimeInfrastructureProfile_1 = require("../infrastructure/RuntimeInfrastructureProfile");
describe('RuntimeInfrastructureProfile', () => {
    it('resolves backends from env in config-driven way', () => {
        const profile = (0, RuntimeInfrastructureProfile_1.resolveRuntimeInfrastructureProfile)({
            COCKPIT_SECRETS_BACKEND: 'postgres',
            COCKPIT_OBJECT_STORAGE_BACKEND: 'postgres',
            RUNTIME_SHARED_DISPATCH_QUEUE_BACKEND: 'redis',
            RUNTIME_SHARED_WORKER_STATE_BACKEND: 'redis',
        });
        expect(profile.secretsBackend).toBe('postgres');
        expect(profile.objectStorageBackend).toBe('postgres');
        expect(profile.dispatchQueueBackend).toBe('redis');
        expect(profile.sharedWorkerStateBackend).toBe('redis');
    });
    it('falls back to sqlite for unknown values', () => {
        const profile = (0, RuntimeInfrastructureProfile_1.resolveRuntimeInfrastructureProfile)({
            COCKPIT_SECRETS_BACKEND: 'nope',
            COCKPIT_OBJECT_STORAGE_BACKEND: '',
            RUNTIME_SHARED_DISPATCH_QUEUE_BACKEND: 'x',
            RUNTIME_SHARED_WORKER_STATE_BACKEND: 'y',
        });
        expect(profile.secretsBackend).toBe('sqlite');
        expect(profile.objectStorageBackend).toBe('sqlite');
        expect(profile.dispatchQueueBackend).toBe('redis');
        expect(profile.sharedWorkerStateBackend).toBe('redis');
        expect(profile.localOnlyMode).toBe(false);
    });
    it('uses distributed runtime defaults when env is not set', () => {
        const profile = (0, RuntimeInfrastructureProfile_1.resolveRuntimeInfrastructureProfile)({});
        expect(profile.dispatchQueueBackend).toBe('redis');
        expect(profile.sharedWorkerStateBackend).toBe('redis');
        expect(profile.localOnlyMode).toBe(false);
    });
    it('supports explicit local-only mode fallback', () => {
        const profile = (0, RuntimeInfrastructureProfile_1.resolveRuntimeInfrastructureProfile)({
            RUNTIME_LOCAL_ONLY_MODE: 'true',
        });
        expect(profile.dispatchQueueBackend).toBe('sqlite');
        expect(profile.sharedWorkerStateBackend).toBe('sqlite');
        expect(profile.localOnlyMode).toBe(true);
    });
});
