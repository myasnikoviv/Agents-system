"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const WorkerProcessExecutor_1 = require("../workers/WorkerProcessExecutor");
describe('Worker process model', () => {
    it('runs workers as isolated role-based subprocesses without shared in-process memory', async () => {
        const first = await (0, WorkerProcessExecutor_1.executeRunContextInSubprocess)({
            timeoutMs: 5000,
            runContext: {
                agent: { slug: 'developer' },
                memory: { workerId: 'worker-developer-1' },
                __processProbe: { setSharedMarker: true },
            },
        });
        const firstPayload = JSON.parse(String(first.content || '{}'));
        const second = await (0, WorkerProcessExecutor_1.executeRunContextInSubprocess)({
            timeoutMs: 5000,
            runContext: {
                agent: { slug: 'tdd-qa' },
                memory: { workerId: 'worker-tdd-qa-1' },
                __processProbe: {},
            },
        });
        const secondPayload = JSON.parse(String(second.content || '{}'));
        expect(firstPayload.agentSlug).toBe('developer');
        expect(firstPayload.workerId).toBe('worker-developer-1');
        expect(firstPayload.beforeSharedMarker).toBe(false);
        expect(firstPayload.afterSharedMarker).toBe(true);
        expect(secondPayload.agentSlug).toBe('tdd-qa');
        expect(secondPayload.workerId).toBe('worker-tdd-qa-1');
        expect(secondPayload.beforeSharedMarker).toBe(false);
        expect(Number(secondPayload.pid)).not.toBe(Number(firstPayload.pid));
    });
});
