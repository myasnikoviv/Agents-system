import { ServiceLifecycleEventBus } from '../control-api/ServiceLifecycleEvents';
import fs from 'fs';
import os from 'os';
import path from 'path';

describe('ServiceLifecycleEventBus (AGSYS-2715)', () => {
  it('emits started/failed/restarted/degraded/stopped with serviceId, reason, and source context', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'service-events-'));
    const file = path.join(dir, 'events.jsonl');
    const bus = new ServiceLifecycleEventBus(file);
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

    const restored = new ServiceLifecycleEventBus(file);
    expect(restored.list().length).toBe(5);
  });
});
