"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ServiceStatusDashboardDataLayer_1 = require("../control-plane/ServiceStatusDashboardDataLayer");
describe('ServiceStatusDashboardDataLayer (AGSYS-2716)', () => {
    it('builds aggregated status, restart counts, health summary, and environment-aware snapshot', () => {
        const manager = {
            listServices: () => ['backend', 'redis', 'worker'],
            getStatus: (serviceId) => {
                if (serviceId === 'backend')
                    return { serviceId, runtime: 'node', desired: 'running', state: { status: 'running', restartCount: 1 } };
                if (serviceId === 'redis')
                    return { serviceId, runtime: 'docker', desired: 'running', state: { status: 'degraded', restartCount: 2 } };
                return { serviceId, runtime: 'node', desired: 'stopped', state: { status: 'stopped', restartCount: 0 } };
            },
        };
        const snapshot = (0, ServiceStatusDashboardDataLayer_1.buildServiceStatusDashboardSnapshot)(manager);
        expect(snapshot.totals.total).toBe(3);
        expect(snapshot.totals.running).toBe(1);
        expect(snapshot.healthSummary.degraded).toBe(2);
        expect(snapshot.restartCounts.total).toBe(3);
        expect(snapshot.restartCounts.byService.backend).toBe(1);
        expect(snapshot.environment.profile).toBeTruthy();
    });
});
