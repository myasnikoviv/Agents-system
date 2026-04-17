"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const telemetryRoutes_1 = require("../../server/routes/telemetryRoutes");
describe('Telemetry metrics overview (AGSYS-3118)', () => {
    it('returns runtime, api and billing metrics from overview provider', async () => {
        const app = (0, express_1.default)();
        (0, telemetryRoutes_1.registerTelemetryRoutes)(app, {
            fetchRecentEvents: async () => [],
            readControlActionAuditRows: async () => [],
            readRunLedgerEvents: async () => [],
            normalizeRuntimeEvent: (row) => row,
            normalizeAuditRow: (row) => row,
            getMetricsOverview: async () => ({
                runtime: { recentEvents: 3, recentRuns: 1 },
                api: { requestsTotal: 10, errorsTotal: 1, avgLatencyMs: 12 },
                billing: { usageRecords: 5, subscriptionsActive: 2 },
                generatedAt: '2026-04-10T00:00:00.000Z',
            }),
        });
        const server = await new Promise((resolve) => {
            const s = app.listen(0, '127.0.0.1', () => resolve(s));
        });
        const { port } = server.address();
        const base = `http://127.0.0.1:${port}`;
        try {
            const response = await fetch(`${base}/api/cockpit/metrics/overview?limit=50`);
            const json = await response.json();
            expect(response.status).toBe(200);
            expect(json.success).toBe(true);
            expect(json.runtime.recentEvents).toBe(3);
            expect(json.api.requestsTotal).toBe(10);
            expect(json.billing.usageRecords).toBe(5);
        }
        finally {
            await new Promise((resolve, reject) => {
                server.close((err) => (err ? reject(err) : resolve()));
            });
        }
    });
});
