import { RuntimeEvent } from '@system/events';
export declare function shouldSyncIssueRef(issueRef: string): boolean;
export declare function mapRuntimeEventToPlaneStateId(event: RuntimeEvent): string | null;
export declare function buildLifecycleComment(event: RuntimeEvent): string;
interface PlaneIssueDetails {
    id: string;
    parent?: string | null;
    state?: string | null;
    assignees?: Array<any>;
    updated_at?: string;
}
export interface ContinuityCheckResult {
    issues: string[];
    warnings: string[];
}
export declare function evaluateContinuityGuard(input: {
    issue: PlaneIssueDetails;
    parentExists: boolean;
    nowMs?: number;
    stuckHoursThreshold?: number;
}): ContinuityCheckResult;
export declare function shouldBlockTerminalTransition(input: {
    event: RuntimeEvent;
    continuity: ContinuityCheckResult;
}): boolean;
export declare function syncPlaneLifecycleForEvent(event: RuntimeEvent): Promise<void>;
export {};
