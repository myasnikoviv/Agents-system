export type WorkerHeatMode = 'hot' | 'cold';
export interface WorkerHeatPolicy {
    version: string;
    hotAgents: string[];
    coldByDefault: boolean;
}
export declare function resolveWorkerHeatPolicy(): WorkerHeatPolicy;
export declare function resolveWorkerHeatMode(agentSlug: string): WorkerHeatMode;
