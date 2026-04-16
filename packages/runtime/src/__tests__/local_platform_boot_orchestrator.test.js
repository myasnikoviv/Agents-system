"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const LocalPlatformBootOrchestrator_1 = require("../control-api/LocalPlatformBootOrchestrator");
describe('LocalPlatformBootOrchestrator (AGSYS-2719)', () => {
    it('boots services via control plane in controlled order without shell orchestration', async () => {
        const started = [];
        const manager = {
            listServices: () => ['backend', 'redis', 'worker'],
            getDescriptor: (serviceId) => {
                if (serviceId === 'backend')
                    return { metadata: { dependsOn: ['redis'] } };
                if (serviceId === 'worker')
                    return { metadata: { dependsOn: ['backend'] } };
                return { metadata: {} };
            },
            getStatus: (serviceId) => {
                if (serviceId === 'redis')
                    return { serviceId, runtime: 'docker', desired: 'running', state: { status: started.includes(serviceId) ? 'running' : 'stopped' } };
                return { serviceId, runtime: 'node', desired: 'running', state: { status: started.includes(serviceId) ? 'running' : 'stopped' } };
            },
            start: async (serviceId) => {
                started.push(serviceId);
                return {};
            },
        };
        const orchestrator = new LocalPlatformBootOrchestrator_1.LocalPlatformBootOrchestrator(manager);
        const result = await orchestrator.bootAll();
        expect(result.success).toBe(true);
        // dependency-aware launch order
        expect(result.launchOrder).toEqual(['redis', 'backend', 'worker']);
        expect(result.services.every((s) => s.status === 'running')).toBe(true);
    });
});
