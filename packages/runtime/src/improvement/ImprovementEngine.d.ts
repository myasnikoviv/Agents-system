export type ImprovementSignalType = 'compliance_issue' | 'cost_issue' | 'throughput_bottleneck';
export interface ImprovementSignal {
    id: string;
    runId: string;
    projectId: string;
    type: ImprovementSignalType;
    severity: 'low' | 'medium' | 'high';
    source: string;
    summary: string;
    metrics?: Record<string, number | string | boolean>;
}
export interface ImprovementTicketDraft {
    type: 'agent_system_improvement';
    scope: string;
    title: string;
    description: string;
    runId: string;
    signalIds: string[];
    priority: 'low' | 'medium' | 'high';
}
export interface LearningEffectKpiResult {
    pass: boolean;
    score: number;
    reason: string;
}
export interface LearningTrendKpiResult {
    pass: boolean;
    score: number;
    reason: string;
    reportPath: string;
    regressionAlarmPath?: string;
}
export declare function generateImprovementSignals(input: {
    workspacePath: string;
    runId: string;
    projectId: string;
}): ImprovementSignal[];
export declare function aggregateSignals(signals: ImprovementSignal[]): ImprovementSignal[];
export declare function buildImprovementTicketDrafts(signals: ImprovementSignal[]): ImprovementTicketDraft[];
export declare function writeImprovementArtifacts(input: {
    workspacePath: string;
    runId: string;
    signals: ImprovementSignal[];
    tickets: ImprovementTicketDraft[];
    commitSha?: string;
}): {
    signalsPath: string;
    ticketsPath: string;
    tracePath: string;
};
export declare function queueIsolationKeys(projectId: string): {
    runtimeQueue: string;
    improvementQueue: string;
};
export declare function enqueueImprovementJob(input: {
    runId: string;
    projectId: string;
    chainId: string;
    workspacePath: string;
    signalsPath: string;
    ticketsPath: string;
    proposalPath?: string;
}): Promise<string | null>;
export declare function evaluateLearningEffectKpi(input: {
    signals: ImprovementSignal[];
    tickets: ImprovementTicketDraft[];
    complianceFailures: number;
    retries: number;
}): LearningEffectKpiResult;
export declare function applySafeTemplateUpdate(input: {
    workspacePath: string;
    relativePath: string;
    content: string;
}): {
    updated: boolean;
    filePath: string;
    backupPath?: string;
    reason?: string;
};
export declare function writeTemplateUpdateProposal(input: {
    workspacePath: string;
    runId: string;
    sourceArtifacts: {
        signalsPath: string;
        ticketsPath: string;
        tracePath: string;
    };
    targetRelativePath: string;
    summary: string;
    proposedContent?: string;
}): {
    proposalPath: string;
};
export declare function evaluateLearningTrendKpi(input: {
    workspacePath: string;
    projectId: string;
    runId: string;
    windowSize?: number;
}): LearningTrendKpiResult;
