"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const telemetryRoutes_1 = require("../../server/routes/telemetryRoutes");
describe('Alerts endpoint (AGSYS-3122)', () => {
    it('returns failure/quota/infra alerts snapshot', async () => {
        const app = (0, express_1.default)();
        (0, telemetryRoutes_1.registerTelemetryRoutes)(app, {
            fetchRecentEvents: async () => [],
            readControlActionAuditRows: async () => [],
            readRunLedgerEvents: async () => [],
            normalizeRuntimeEvent: (row) => row,
            normalizeAuditRow: (row) => row,
            getAlertsSnapshot: async () => ({
                alerts: [
                    { code: 'failures_alert', status: 'firing' },
                    { code: 'quota_alert', status: 'firing' },
                    { code: 'infra_alert', status: 'firing' },
                ],
                channels: ['in_app', 'audit_log'],
            }),
        });
        const server = await new Promise((resolve) => {
            const s = app.listen(0, '127.0.0.1', () => resolve(s));
        });
        const { port } = server.address();
        const base = `http://127.0.0.1:${port}`;
        try {
            const response = await fetch(`${base}/api/cockpit/alerts`);
            const json = await response.json();
            expect(response.status).toBe(200);
            expect(json.success).toBe(true);
            expect(json.configured).toBe(true);
            expect(json.alerts.length).toBe(3);
            expect(json.channels).toContain('in_app');
        }
        finally {
            await new Promise((resolve, reject) => {
                server.close((err) => (err ? reject(err) : resolve()));
            });
        }
    });
});
