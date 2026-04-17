import { RunContext, StructuredArtifact, ResponseMode, TaskPackage, DetectedLanguage } from '@system/shared';
export { RunContext, StructuredArtifact, ResponseMode, TaskPackage, DetectedLanguage };
import { AgentProfile, PipelineDefinition } from '../DynamicDiscoveryService';
export declare class RunContextAssembler {
    static assemble(agent: AgentProfile, pipeline: PipelineDefinition, stageId: string, taskDescription: string, memory?: any, runtimeHints?: {
        preferredLanguage?: DetectedLanguage;
    }, projectContext?: {
        projectId: string;
        workspacePath: string;
    }): Promise<RunContext>;
}
