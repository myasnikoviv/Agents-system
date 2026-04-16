import { ControlPlaneCore, ServiceRuntimeStatus } from './ControlPlaneCore';

export type ReconcileActionType = 'start' | 'stop' | 'restart' | 'noop';

export interface ServiceObservedState {
  serviceId: string;
  status: ServiceRuntimeStatus;
  checkedAt: string;
  reason?: string;
}

export interface ReconcileAction {
  serviceId: string;
  type: ReconcileActionType;
  reason: string;
}

export interface ReconciliationTickResult {
  startedAt: string;
  finishedAt: string;
  actions: ReconcileAction[];
}

export interface ReconciliationEngineOptions {
  intervalMs?: number;
  observe: (serviceId: string) => Promise<ServiceObservedState> | ServiceObservedState;
  execute: (action: ReconcileAction) => Promise<void> | void;
}

function decideAction(input: {
  desired: 'running' | 'stopped';
  observedStatus: ServiceRuntimeStatus;
}): ReconcileActionType {
  if (input.desired === 'running') {
    if (input.observedStatus === 'healthy' || input.observedStatus === 'starting') return 'noop';
    if (input.observedStatus === 'failed' || input.observedStatus === 'degraded') return 'restart';
    return 'start';
  }
  if (input.observedStatus === 'stopped') return 'noop';
  return 'stop';
}

export class ReconciliationEngine {
  private readonly core: ControlPlaneCore;
  private readonly options: Required<ReconciliationEngineOptions>;
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(core: ControlPlaneCore, options: ReconciliationEngineOptions) {
    this.core = core;
    this.options = {
      intervalMs: Math.max(100, Number(options.intervalMs || 1000)),
      observe: options.observe,
      execute: options.execute,
    };
  }

  isRunning(): boolean {
    return this.running;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.timer = setInterval(() => {
      this.runOnce().catch(() => {
        // keep loop alive; errors are reflected in control plane state updates.
      });
    }, this.options.intervalMs);
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async runOnce(): Promise<ReconciliationTickResult> {
    const startedAt = new Date().toISOString();
    const actions: ReconcileAction[] = [];

    for (const serviceId of this.core.listServiceIds()) {
      try {
        const observed = await this.options.observe(serviceId);
        this.core.setStatus({
          serviceId,
          status: observed.status,
          checkedAt: observed.checkedAt,
          errorReason: observed.reason || null,
        });

        const state = this.core.getState(serviceId);
        const nextAction = decideAction({ desired: state.desired, observedStatus: observed.status });
        if (nextAction === 'noop') continue;

        const action: ReconcileAction = {
          serviceId,
          type: nextAction,
          reason: `desired=${state.desired};observed=${observed.status}`,
        };
        actions.push(action);
        await this.options.execute(action);

        if (nextAction === 'restart') {
          this.core.setStatus({
            serviceId,
            status: 'starting',
            checkedAt: new Date().toISOString(),
            incrementRestart: true,
            errorReason: null,
          });
        }
      } catch (error: any) {
        this.core.setStatus({
          serviceId,
          status: 'failed',
          checkedAt: new Date().toISOString(),
          errorReason: String(error?.message || error || 'reconciliation_observe_failed'),
        });
      }
    }

    return {
      startedAt,
      finishedAt: new Date().toISOString(),
      actions,
    };
  }
}
