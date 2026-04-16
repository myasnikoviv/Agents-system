"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const telemetryRoutes_1 = require("../../server/routes/telemetryRoutes");
describe('Data classification endpoint (AGSYS-3127)', () => {
    it('returns pii/sensitive/policies sections', async () => {
        const app = (0, express_1.default)();
        (0, telemetryRoutes_1.registerTelemetryRoutes)(app, {
            fetchRecentEvents: async () => [],
            readControlActionAuditRows: async () => [],
            readRunLedgerEvents: async () => [],
            normalizeRuntimeEvent: (row) => row,
            normalizeAuditRow: (row) => row,
            getDataClassification: async () => ({
                pii: [{ field: 'user.email' }],
                sensitive: [{ field: 'runtime.audit' }],
                policies: [{ id: 'policy.data.access' }],
            }),
        });
        const server = await new Promise((resolve) => {
            const s = app.listen(0, '127.0.0.1', () => resolve(s));
        });
        const { port } = server.address();
        const base = `http://127.0.0.1:${port}`;
        try {
            const response = await fetch(`${base}/api/cockpit/compliance/data-classification`);
            const json = await response.json();
            expect(response.status).toBe(200);
            expect(json.success).toBe(true);
            expect(json.configured).toBe(true);
            expect(Array.isArray(json.pii)).toBe(true);
            expect(Array.isArray(json.sensitive)).toBe(true);
            expect(Array.isArray(json.policies)).toBe(true);
        }
        finally {
            await new Promise((resolve, reject) => {
                server.close((err) => (err ? reject(err) : resolve()));
            });
        }
    });
});
