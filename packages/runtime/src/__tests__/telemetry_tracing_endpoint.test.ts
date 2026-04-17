import express from 'express';
import { AddressInfo } from 'net';
import { registerTelemetryRoutes } from '../../server/routes/telemetryRoutes';

describe('Telemetry tracing endpoint (AGSYS-3119)', () => {
  it('returns api spans and runtime events by runId', async () => {
    const app = express();
    registerTelemetryRoutes(app, {
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
      normalizeRuntimeEvent: (row: any) => ({
        id: String(row.id),
        timestamp: Number(row.timestamp),
        isoTime: new Date(Number(row.timestamp)).toISOString(),
        source: 'runtime' as const,
        category: 'agent' as const,
        type: String(row.type),
        runId: String(row.runId),
        payload: row.payload || {},
      }),
      normalizeAuditRow: (row: any) => row,
      listApiTraceSpans: async () => [
        { traceId: 'trace-1', spanId: 'span-1', runId: 'run-1', path: '/api/chat', statusCode: 200 },
      ],
    });

    const server = await new Promise<import('http').Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    const { port } = server.address() as AddressInfo;
    const base = `http://127.0.0.1:${port}`;
    try {
      const response = await fetch(`${base}/api/cockpit/telemetry/traces?runId=run-1`);
      const json: any = await response.json();
      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.counts.apiSpans).toBe(1);
      expect(json.counts.runtimeEvents).toBe(1);
      expect(json.runtimeEvents[0]?.type).toBe('agent.started');
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });
});
