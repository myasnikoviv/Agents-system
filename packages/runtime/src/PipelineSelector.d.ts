import { ProjectRuntimeManifest } from './ProjectRuntimeManifest';
export type PipelineId = string;
export interface PipelineSelection {
    selectedPipeline: PipelineId;
    confidence: 'high' | 'medium' | 'low';
    reason: string;
}
export declare function selectPipelineFromManifest(message: string, manifest: ProjectRuntimeManifest): PipelineSelection;
export declare function selectPipelineFromMessage(message: string): PipelineSelection;
export declare function selectPipelineForProject(message: string, projectRoot?: string): Promise<PipelineSelection>;
