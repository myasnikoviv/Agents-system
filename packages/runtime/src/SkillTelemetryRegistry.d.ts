export interface SkillUsageEntry {
    timestamp: string;
    runId: string;
    ticketId: string;
    threadId: string;
    roleSlug: string;
    pipelineId: string;
    stage: string;
    skillId: string;
    sourcePath: string;
    durationMs: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    outcome: 'success' | 'default' | 'error';
}
export interface SkillTelemetrySummary {
    totalEvents: number;
    bySkill: Record<string, number>;
    byRole: Record<string, number>;
    byPipeline: Record<string, number>;
    unusedSkills: string[];
}
export declare function appendSkillUsage(entry: SkillUsageEntry): Promise<void>;
export declare function readSkillUsage(): Promise<SkillUsageEntry[]>;
export declare function getSkillTelemetrySummary(): Promise<SkillTelemetrySummary>;
