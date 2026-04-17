import { InMemoryServiceStateStore } from '../control-api/ServiceStateStore';

describe('ServiceStateStore (AGSYS-2704)', () => {
  it('stores and retrieves state in memory', () => {
    const store = new InMemoryServiceStateStore();
    store.upsert({
      serviceId: 'backend',
      desired: 'running',
      status: 'healthy',
      restartCount: 1,
      lastCheckAt: '2026-04-09T00:00:00.000Z',
      errorReason: null,
    });

    const row = store.get('backend');
    expect(row?.status).toBe('healthy');
    expect(row?.restartCount).toBe(1);
    expect(store.list().length).toBe(1);
  });
});
