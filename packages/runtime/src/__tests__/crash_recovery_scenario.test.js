"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ControlApiCore_1 = require("../control-api/ControlApiCore");
const ServiceStateStore_1 = require("../control-api/ServiceStateStore");
const RestartPolicyEngine_1 = require("../control-api/RestartPolicyEngine");
describe('Crash recovery scenario (AGSYS-2717)', () => {
    it('service kill leads to controlled restart without state loss or infinite loop', () => {
        const store = new ServiceStateStore_1.InMemoryServiceStateStore();
        const core = new ControlApiCore_1.ControlApiCore({
            schemaVersion: 'service-registry.v1',
            services: {
                backend: {
                    type: 'api',
                    runtime: 'node',
                    desired: { state: 'running', restartPolicy: { mode: 'on-failure', maxRetries: 3, backoffMs: 100 } },
                },
            },
        }, { stateStore: store });
        const restart = new RestartPolicyEngine_1.RestartPolicyEngine({ loopWindowMs: 60_000, loopThreshold: 4 });
        // Simulate crash (service kill).
        core.setStatus({
            serviceId: 'backend',
            status: 'failed',
            errorReason: 'killed_by_signal',
            incrementRestart: true,
        });
        const failed = core.getState('backend');
        const decision = restart.decide('backend', core.getDescriptor('backend'), failed, 'crash');
        expect(decision.allowed).toBe(true);
        expect(decision.loopDetected).toBe(false);
        // Execute restart and persist state.
        restart.recordRestart('backend');
        core.setStatus({ serviceId: 'backend', status: 'starting' });
        core.setStatus({ serviceId: 'backend', status: 'healthy' });
        const restoredCore = new ControlApiCore_1.ControlApiCore({
            schemaVersion: 'service-registry.v1',
            services: {
                backend: {
                    type: 'api',
                    runtime: 'node',
                    desired: { state: 'running', restartPolicy: { mode: 'on-failure', maxRetries: 3, backoffMs: 100 } },
                },
            },
        }, { stateStore: store });
        const restored = restoredCore.getState('backend');
        expect(restored.status).toBe('healthy');
        expect(restored.restartCount).toBe(1); // restart visible and state preserved
    });
});
