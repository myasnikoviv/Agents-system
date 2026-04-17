export interface AgentDefinition {
    callsign: string;
    mission: string;
    owns: string[];
    guardrails: string[];
    fullInstructions: string;
}
export declare class AgentFactory {
    private static AGENTS_DIR;
    /**
     * Parse an agent definition from its markdown file.
     */
    static loadAgent(roleSlug: string): Promise<AgentDefinition>;
    private static extractSection;
    private static extractListSection;
}
