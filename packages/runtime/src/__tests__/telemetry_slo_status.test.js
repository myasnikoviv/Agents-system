"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const telemetryRoutes_1 = require("../../server/routes/telemetryRoutes");
describe('SLO status endpoint (AGSYS-3121)', () => {
    it('returns configured slo targets and compliance status', async () => {
        const app = (0, express_1.default)();
        (0, telemetryRoutes_1.registerTelemetryRoutes)(app, {
            fetchRecentEvents: async () => [],
            readControlActionAuditRows: async () => [],
            readRunLedgerEvents: async () => [],
            normalizeRuntimeEvent: (row) => row,
            normalizeAuditRow: (row) => row,
            getSloStatus: async () => ({
                targets: { uptimePct: 99.9, p95LatencyMs: 1200, successRatePct: 99.0 },
                observed: { uptimePct: 99.95, avgLatencyMs: 300, successRatePct: 99.5, requestsTotal: 1000 },
                compliance: { uptime: true, latency: true, successRate: true },
            }),
        });
        const server = await new Promise((resolve) => {
            const s = app.listen(0, '127.0.0.1', () => resolve(s));
        });
        const { port } = server.address();
        const base = `http://127.0.0.1:${port}`;
        try {
            const response = await fetch(`${base}/api/cockpit/sre/slo`);
            const json = await response.json();
            expect(response.status).toBe(200);
            expect(json.success).toBe(true);
            expect(json.configured).toBe(true);
            expect(json.targets.successRatePct).toBe(99.0);
            expect(json.compliance.latency).toBe(true);
        }
        finally {
            await new Promise((resolve, reject) => {
                server.close((err) => (err ? reject(err) : resolve()));
            });
        }
    });
});
