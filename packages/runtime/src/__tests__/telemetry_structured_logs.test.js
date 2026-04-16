"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const telemetryRoutes_1 = require("../../server/routes/telemetryRoutes");
describe('Structured logs endpoint (AGSYS-3120)', () => {
    it('returns filtered structured logs', async () => {
        const app = (0, express_1.default)();
        (0, telemetryRoutes_1.registerTelemetryRoutes)(app, {
            fetchRecentEvents: async () => [],
            readControlActionAuditRows: async () => [],
            readRunLedgerEvents: async () => [],
            normalizeRuntimeEvent: (row) => row,
            normalizeAuditRow: (row) => row,
            readStructuredLogs: async () => [
                { timestamp: '2026-04-10T12:00:00.000Z', level: 'error', source: 'http', message: 'GET /api/chat' },
            ],
        });
        const server = await new Promise((resolve) => {
            const s = app.listen(0, '127.0.0.1', () => resolve(s));
        });
        const { port } = server.address();
        const base = `http://127.0.0.1:${port}`;
        try {
            const response = await fetch(`${base}/api/cockpit/logs?level=error&source=http`);
            const json = await response.json();
            expect(response.status).toBe(200);
            expect(json.success).toBe(true);
            expect(json.count).toBe(1);
            expect(json.logs[0]?.level).toBe('error');
        }
        finally {
            await new Promise((resolve, reject) => {
                server.close((err) => (err ? reject(err) : resolve()));
            });
        }
    });
});
