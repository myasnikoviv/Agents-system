import { AgentRegistry, AgentProfile } from './registries/AgentRegistry';
import { PipelineRegistry, PipelineDefinition, PipelineStage } from './registries/PipelineRegistry';
import { SkillRegistry, SkillProfile } from './registries/SkillRegistry';
export { AgentRegistry, AgentProfile, PipelineRegistry, PipelineDefinition, PipelineStage, SkillRegistry, SkillProfile };
export declare class DynamicDiscoveryService {
    private static defaultDocsPath;
    private static defaultManifestPath;
    private static resolveFromManifestPath;
    static discoverAll(projectRoot?: string, options?: {
        externalAgentsRoot?: string;
        forceRefresh?: boolean;
    }): Promise<void>;
    static discoverSpecific(filePath: string, type: string): Promise<void>;
    static discoverAgents(docsPath?: string): Promise<void>;
    static discoverAgentsFromFiles(files: string[], callsignsBySlug?: Record<string, string>): Promise<void>;
    static discoverPipelines(docsPath?: string): Promise<void>;
    static discoverPipelinesFromFiles(files: string[]): Promise<void>;
    static discoverSkills(docsPath?: string): Promise<void>;
    static discoverSkillsFromFiles(files: string[]): Promise<void>;
    static discoverLoops(root: string): Promise<void>;
    static discoverMeetingSpecs(root: string): Promise<void>;
    static discoverGovernanceRules(root: string): Promise<void>;
    static discoverGovernanceProfiles(root: string): Promise<void>;
    private static parseManifestMetadata;
    private static extractList;
    private static normalizeInlineLabel;
    private static parsePipelineStages;
    private static normalizeRoleToSlug;
}
