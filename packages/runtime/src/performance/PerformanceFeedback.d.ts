export interface AgentScoreRow {
    agentSlug: string;
    score: number;
}
export declare function collectAgentPerformanceScores(input: {
    workspacePath: string;
    projectId: string;
    agentSlugs: string[];
}): AgentScoreRow[];
export declare function applyPerformanceFeedbackOrder(agentSlugs: string[], scoreRows: AgentScoreRow[]): string[];
