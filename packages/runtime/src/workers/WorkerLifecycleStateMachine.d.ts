export type WorkerLifecycleState = 'cold' | 'starting' | 'hot' | 'active' | 'idle' | 'stopping' | 'failed';
export declare function canTransition(from: WorkerLifecycleState, to: WorkerLifecycleState): boolean;
export declare function applyLifecycleTransition(from: WorkerLifecycleState, to: WorkerLifecycleState): {
    ok: true;
    to: WorkerLifecycleState;
} | {
    ok: false;
    reason: string;
};
