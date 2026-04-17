import type { ServiceRuntimeState } from './ControlApiCore';

export interface ControlApiServiceStateStore {
  upsert(state: ServiceRuntimeState): void;
  get(serviceId: string): ServiceRuntimeState | null;
  list(): ServiceRuntimeState[];
}

export class InMemoryServiceStateStore implements ControlApiServiceStateStore {
  private readonly rows = new Map<string, ServiceRuntimeState>();

  upsert(state: ServiceRuntimeState): void {
    this.rows.set(state.serviceId, { ...state });
  }

  get(serviceId: string): ServiceRuntimeState | null {
    const found = this.rows.get(serviceId);
    return found ? { ...found } : null;
  }

  list(): ServiceRuntimeState[] {
    return Array.from(this.rows.values()).map((row) => ({ ...row }));
  }
}
