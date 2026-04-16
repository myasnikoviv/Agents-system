import { RuntimeEvent } from '@system/events';
export interface LedgerEntry {
    timestamp: number;
    runId: string;
    projectId: string;
    chainId: string;
    type: string;
    actorId: string;
    actorType: string;
    payload: string;
    failureReason: string;
}
export declare function classifyFailureReason(event: RuntimeEvent): string;
export declare function appendRunLedger(event: RuntimeEvent): Promise<void>;
