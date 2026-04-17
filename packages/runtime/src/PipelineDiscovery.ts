import fs from 'fs';
import path from 'path';

export interface DiscoveryPipelineStep {
  index: number;
  role: string;
  roleSlug: string;
  description: string;
}

export interface DiscoveryPipelineDefinition {
  id: string;
  name: string;
  steps: DiscoveryPipelineStep[];
}

const ROLE_MAP: Record<string, string> = {
  'PM': 'pm-orchestrator',
  'Research Agent': 'research-agent',
  'Trader': 'trader-analyst',
  'Trader Analyst': 'trader-analyst',
  'Solution Architect': 'solution-architect',
  'Architect': 'solution-architect',
  'TDD QA': 'tdd-qa',
  'QA': 'tdd-qa',
  'Developer': 'developer',
  'Reviewer': 'code-reviewer',
  'Code Reviewer': 'code-reviewer',
  'Runner': 'runner-backtest',
  'Runner Backtest': 'runner-backtest',
  'Knowledge Curator': 'knowledge-curator',
  'Learning Agent': 'knowledge-curator',
  'Domain Validator': 'domain-validator',
  'Git Flow Manager': 'git-flow-manager',
  'Git': 'git-flow-manager',
  'DevOps Engineer': 'devops-engineer',
  'DevOps': 'devops-engineer',
  'Design Lead': 'design-lead',
  'Documentation Owner': 'documentation-owner',
  'Docs': 'documentation-owner',
};

export class PipelineDiscovery {
  private static cache: Map<string, DiscoveryPipelineDefinition> = new Map();

  static async loadPipeline(pipelineId: string): Promise<DiscoveryPipelineDefinition> {
    if (this.cache.has(pipelineId)) {
      return this.cache.get(pipelineId)!;
    }

    const filePath = path.join(process.cwd(), 'docs', 'pipelines', `${pipelineId}.md`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Pipeline file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const definition = this.parsePipelineMarkdown(pipelineId, content);
    this.cache.set(pipelineId, definition);
    return definition;
  }

  private static parsePipelineMarkdown(id: string, content: string): DiscoveryPipelineDefinition {
    const lines = content.split('\n');
    const firstLine = lines[0] || '';
    const nameMatch = firstLine.match(/# Pipeline:\s*(.*)/);
    const name = (nameMatch && nameMatch[1]) ? nameMatch[1].trim() : id;

    const steps: DiscoveryPipelineStep[] = [];
    let inSteps = false;

    for (const line of lines) {
      if (line.trim().startsWith('## Steps')) {
        inSteps = true;
        continue;
      }
      if (inSteps && line.trim().startsWith('##')) {
        if (!line.trim().startsWith('## Steps')) {
          inSteps = false;
        }
      }

      if (inSteps) {
        // Matches "1. PM: ..." or "2. Research Agent: ..." or "1.1 PM: ..."
        const stepMatch = line.match(/^(\d+(\.\d+)?)\.\s*([^:]+):\s*(.*)/);
        if (stepMatch && stepMatch[1] && stepMatch[3] && stepMatch[4]) {
          const indexStr = stepMatch[1];
          const roleRaw = stepMatch[3].trim();
          const description = stepMatch[4].trim();

          // Try to find the closest match in ROLE_MAP
          const roleSlug = this.resolveRoleSlug(roleRaw);

          steps.push({
            index: parseFloat(indexStr),
            role: roleRaw,
            roleSlug,
            description,
          });
        }
      }
    }

    return { id, name, steps };
  }

  private static resolveRoleSlug(roleRaw: string): string {
    // Exact match
    if (ROLE_MAP[roleRaw]) return ROLE_MAP[roleRaw];

    // Case-insensitive match
    const lower = roleRaw.toLowerCase();
    for (const [key, slug] of Object.entries(ROLE_MAP)) {
      if (key.toLowerCase() === lower) return slug;
    }

    // Partial match (e.g. "PM + Architect" -> "pm-orchestrator")
    for (const [key, slug] of Object.entries(ROLE_MAP)) {
      if (lower.includes(key.toLowerCase())) return slug;
    }

    return 'pm-orchestrator'; // Fallback
  }

  static getNextStep(definition: DiscoveryPipelineDefinition, currentStatus: string): DiscoveryPipelineStep | null {
    const currentIndex = this.statusToStepIndex(currentStatus);
    return definition.steps.find((s) => s.index > currentIndex) || null;
  }

  private static statusToStepIndex(status: string): number {
    if (status === 'initialized' || status === 'unknown') return 0;
    if (status === 'intake_completed') return 1;
    // Follow the pattern: <role_slug>_completed or similar
    // We can also have state.current_step_index in the future, but for now we infer.
    
    // Fallback search in role map if status contains role name
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('research')) return 3;
    if (lowerStatus.includes('trader')) return 6;
    if (lowerStatus.includes('architecture') || lowerStatus.includes('architect')) return 6;
    if (lowerStatus.includes('qa')) return 9;
    if (lowerStatus.includes('dev')) return 10;
    if (lowerStatus.includes('reviewer')) return 12;
    if (lowerStatus.includes('runner')) return 13;
    if (lowerStatus.includes('domain')) return 14;
    if (lowerStatus.includes('git')) return 17;
    if (lowerStatus.includes('docs')) return 18;

    return 1; // Default after intake
  }
}
