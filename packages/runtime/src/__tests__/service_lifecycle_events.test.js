"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ServiceLifecycleEvents_1 = require("../control-api/ServiceLifecycleEvents");
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
describe('ServiceLifecycleEventBus (AGSYS-2715)', () => {
    it('emits started/failed/restarted/degraded/stopped with serviceId, reason, and source context', () => {
        const dir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'service-events-'));
        const file = path_1.default.join(dir, 'events.jsonl');
        const bus = new ServiceLifecycleEvents_1.ServiceLifecycleEventBus(file);
        bus.emit('service.started', 'backend', null, { source: 'api', actorId: 'u1' });
        bus.emit('service.failed', 'backend', 'process crashed');
        bus.emit('service.restarted', 'backend');
        bus.emit('service.degraded', 'backend', 'heartbeat missing');
        bus.emit('service.stopped', 'backend');
        const events = bus.list();
        expect(events.map((e) => e.kind)).toEqual([
            'service.started',
            'service.failed',
            'service.restarted',
            'service.degraded',
            'service.stopped',
        ]);
        expect(events.every((e) => !!e.serviceId)).toBe(true);
        expect(events.find((e) => e.kind === 'service.failed')?.reason).toContain('crashed');
        expect(events.find((e) => e.kind === 'service.degraded')?.reason).toContain('heartbeat');
        expect(events[0].source).toBe('api');
        expect(events[0].actorId).toBe('u1');
        const restored = new ServiceLifecycleEvents_1.ServiceLifecycleEventBus(file);
        expect(restored.list().length).toBe(5);
    });
});
