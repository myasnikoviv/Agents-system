"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const telemetryRoutes_1 = require("../../server/routes/telemetryRoutes");
describe('Telemetry tracing endpoint (AGSYS-3119)', () => {
    it('returns api spans and runtime events by runId', async () => {
        const app = (0, express_1.default)();
        (0, telemetryRoutes_1.registerTelemetryRoutes)(app, {
            fetchRecentEvents: async () => [],
            readControlActionAuditRows: async () => [],
            readRunLedgerEvents: async () => [
                {
                    id: 'evt-1',
                    timestamp: Date.parse('2026-04-10T12:00:00Z'),
                    type: 'agent.started',
                    runId: 'run-1',
                    payload: {},
                },
            ],
            normalizeRuntimeEvent: (row) => ({
                id: String(row.id),
                timestamp: Number(row.timestamp),
                isoTime: new Date(Number(row.timestamp)).toISOString(),
                source: 'runtime',
                category: 'agent',
                type: String(row.type),
                runId: String(row.runId),
                payload: row.payload || {},
            }),
            normalizeAuditRow: (row) => row,
            listApiTraceSpans: async () => [
                { traceId: 'trace-1', spanId: 'span-1', runId: 'run-1', path: '/api/chat', statusCode: 200 },
            ],
        });
        const server = await new Promise((resolve) => {
            const s = app.listen(0, '127.0.0.1', () => resolve(s));
        });
        const { port } = server.address();
        const base = `http://127.0.0.1:${port}`;
        try {
            const response = await fetch(`${base}/api/cockpit/telemetry/traces?runId=run-1`);
            const json = await response.json();
            expect(response.status).toBe(200);
            expect(json.success).toBe(true);
            expect(json.counts.apiSpans).toBe(1);
            expect(json.counts.runtimeEvents).toBe(1);
            expect(json.runtimeEvents[0]?.type).toBe('agent.started');
        }
        finally {
            await new Promise((resolve, reject) => {
                server.close((err) => (err ? reject(err) : resolve()));
            });
        }
    });
});
