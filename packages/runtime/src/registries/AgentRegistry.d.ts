export interface AgentProfile {
    slug: string;
    name: string;
    title: string;
    callsign: string;
    mission: string;
    description: string;
    instructions: string;
    owns: string[];
    guardrails: string[];
    skills: string[];
    tools: string[];
    fullInstructions: string;
    sourcePath: string;
    assetId?: string;
    projectId?: string;
}
export declare class AgentRegistry {
    private static agents;
    static register(profile: AgentProfile): void;
    static getAgent(slug: string): AgentProfile | undefined;
    static getAllAgents(): AgentProfile[];
    static clear(): void;
}
