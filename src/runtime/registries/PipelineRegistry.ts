export interface PipelineStage {
  id: string;
  name: string;
  title: string;
  role: string;
  agent: string; // The agent slug to execute this stage
  description: string;
  instructions: string;
  nextAllowedRoles: string[];
  completionCriteria: string;
}

export interface PipelineDefinition {
  id: string;
  name: string;
  title: string;
  slug: string; // The filename slug
  description?: string;
  stages: PipelineStage[];
  sourcePath: string;
}

export class PipelineRegistry {
  private static pipelines: Map<string, PipelineDefinition> = new Map();

  static register(definition: PipelineDefinition) {
    this.pipelines.set(definition.slug, definition);
    this.pipelines.set(definition.id, definition); // handle both if they differ
  }

  static getPipeline(idOrSlug: string): PipelineDefinition | undefined {
    return this.pipelines.get(idOrSlug);
  }

  static getNextStage(pipelineId: string, currentStageId: string): PipelineStage | undefined {
    const pipeline = this.getPipeline(pipelineId);
    if (!pipeline) return undefined;
    
    // If currentStageId is empty or START, return first stage
    if (!currentStageId || currentStageId === 'START') {
      return pipeline.stages[0];
    }
    
    const currentIndex = pipeline.stages.findIndex(s => s.id === currentStageId);
    if (currentIndex === -1) {
      return pipeline.stages[0];
    }
    if (currentIndex >= pipeline.stages.length - 1) {
      return undefined;
    }
    
    return pipeline.stages[currentIndex + 1];
  }

  static getAllPipelines(): PipelineDefinition[] {
    const unique = new Set(this.pipelines.values());
    return Array.from(unique);
  }

  static clear() {
    this.pipelines.clear();
  }
}
