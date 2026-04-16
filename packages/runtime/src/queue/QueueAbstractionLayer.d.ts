import { DispatchQueueTask, DlqQueueTask } from './ProjectDispatchQueue';
export interface QueueLease {
    leaseId: string;
    task: DispatchQueueTask;
    consumerId: string;
    dequeuedAt: number;
}
export interface DequeueRequest {
    projectId: string;
    agentSlug: string;
    consumerId: string;
    environmentId?: string;
}
export interface NackRequest {
    leaseId: string;
    reason?: string;
    requeue?: boolean;
}
export declare class QueueAbstractionLayer {
    static enqueue(input: Omit<DispatchQueueTask, 'taskId' | 'enqueuedAt'>): Promise<DispatchQueueTask>;
    static dequeue(input: DequeueRequest): Promise<QueueLease | null>;
    static ack(leaseId: string): Promise<boolean>;
    static nack(input: NackRequest): Promise<DispatchQueueTask | null>;
    static retry(input: {
        projectId: string;
        taskId: string;
        actorId?: string;
    }): Promise<DispatchQueueTask | null>;
    static toDlq(input: {
        task: DispatchQueueTask;
        reason: string;
        retriesExhausted: number;
        actorId?: string;
    }): Promise<DlqQueueTask>;
    static listDlq(projectId?: string): Promise<DlqQueueTask[]>;
    static requeueDlq(input: {
        projectId: string;
        dlqId: string;
        actorId?: string;
    }): Promise<DispatchQueueTask | null>;
    static setPriority(input: {
        projectId: string;
        taskId: string;
        priority: number;
        actorId?: string;
    }): Promise<DispatchQueueTask | null>;
    static depth(projectId: string, agentSlug?: string, options?: {
        environmentId?: string;
    }): Promise<number>;
    static clear(): Promise<void>;
    static inflightCount(): number;
}
