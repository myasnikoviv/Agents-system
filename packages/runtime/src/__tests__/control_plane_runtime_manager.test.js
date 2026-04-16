"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ControlPlaneRuntimeManager_1 = require("../control-plane/ControlPlaneRuntimeManager");
const ServiceExecutionAdapter_1 = require("../control-plane/adapters/ServiceExecutionAdapter");
const ServiceLifecycleEvents_1 = require("../control-plane/ServiceLifecycleEvents");
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
function createStubAdapter(adapterId) {
    const state = new Map();
    return {
        adapterId,
        async start(serviceId, spec) {
            const next = {
                serviceId,
                status: 'running',
                spec,
                pid: 1234,
                startedAt: new Date().toISOString(),
                stoppedAt: null,
                exitCode: null,
                signal: null,
                crashReason: null,
                [Symbol.iterator]: undefined // Mocking it doesn't need iterator but needs index signature
            };
            state.set(serviceId, next);
            return next;
        },
        async stop(serviceId) {
            const next = {
                serviceId,
                status: 'stopped',
                pid: null,
                startedAt: null,
                stoppedAt: new Date().toISOString(),
                exitCode: 0,
                signal: null,
                crashReason: null
            };
            state.set(serviceId, next);
            return next;
        },
        async restart(serviceId) {
            const next = {
                serviceId,
                status: 'running',
                restarted: true,
                pid: 1235,
                startedAt: new Date().toISOString(),
                stoppedAt: null,
                exitCode: null,
                signal: null,
                crashReason: null
            };
            state.set(serviceId, next);
            return next;
        },
        getRuntime(serviceId) {
            return state.get(serviceId) || {
                serviceId,
                status: 'idle',
                pid: null,
                startedAt: null,
                stoppedAt: null,
                exitCode: null,
                signal: null,
                crashReason: null
            };
        },
    };
}
describe('ControlPlaneRuntimeManager (AGSYS-2713)', () => {
    it('lists services and returns runtime-aware status', () => {
        const adapters = new ServiceExecutionAdapter_1.ServiceExecutionAdapterRegistry();
        adapters.register(createStubAdapter('local-process'));
        adapters.register(createStubAdapter('docker'));
        const manager = new ControlPlaneRuntimeManager_1.ControlPlaneRuntimeManager({
            schemaVersion: 'service-registry.v1',
            services: {
                backend: { type: 'api', runtime: 'node', desired: { state: 'running' }, entrypoint: process.execPath },
                redis: { type: 'infra', runtime: 'docker', desired: { state: 'running' }, metadata: { image: 'redis:7-alpine' } },
            },
        }, adapters);
        expect(manager.listServices()).toEqual(['backend', 'redis']);
        expect(manager.getStatus('backend').desired).toBe('running');
    });
    it('supports start/stop/restart actions', async () => {
        const adapters = new ServiceExecutionAdapter_1.ServiceExecutionAdapterRegistry();
        const events = new ServiceLifecycleEvents_1.ServiceLifecycleEventBus(path_1.default.join(fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'manager-events-')), 'events.jsonl'));
        adapters.register(createStubAdapter('local-process'));
        adapters.register(createStubAdapter('docker'));
        const manager = new ControlPlaneRuntimeManager_1.ControlPlaneRuntimeManager({
            schemaVersion: 'service-registry.v1',
            services: {
                backend: { type: 'api', runtime: 'node', desired: { state: 'running' }, entrypoint: process.execPath },
            },
        }, adapters, events);
        const started = await manager.start('backend', { source: 'api', actorId: 'admin-1' });
        expect(started.state.status).toBe('running');
        const restarted = await manager.restart('backend');
        expect(restarted.state.status).toBe('running');
        const stopped = await manager.stop('backend', { source: 'api', actorId: 'admin-1' });
        expect(stopped.state.status).toBe('stopped');
        const lifecycle = manager.listLifecycleEvents();
        expect(lifecycle.some((e) => e.kind === 'service.started' && e.serviceId === 'backend')).toBe(true);
        expect(lifecycle.some((e) => e.kind === 'service.restarted' && e.serviceId === 'backend')).toBe(true);
        expect(lifecycle.some((e) => e.kind === 'service.stopped' && e.serviceId === 'backend')).toBe(true);
        expect(lifecycle.some((e) => e.actorId === 'admin-1')).toBe(true);
    });
});
