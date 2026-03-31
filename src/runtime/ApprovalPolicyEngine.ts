import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { RunContext } from './context/RunContext';

export type ApprovalMode = 'interrupt_before' | 'interrupt_after';

export interface ApprovalPolicy {
  id: string;
  mode: ApprovalMode;
  nodes: string[];
  condition: string;
  description: string;
}

export interface ApprovalConfig {
  version: string;
  policies: ApprovalPolicy[];
  default_mode: string;
}

export class ApprovalPolicyEngine {
  private static instance: ApprovalPolicyEngine;
  private config: ApprovalConfig | null = null;
  private configPath = 'docs/runtime/governance/approval-policy.yaml';

  private constructor() {
    this.loadConfig();
  }

  static getInstance(): ApprovalPolicyEngine {
    if (!ApprovalPolicyEngine.instance) {
      ApprovalPolicyEngine.instance = new ApprovalPolicyEngine();
    }
    return ApprovalPolicyEngine.instance;
  }

  private loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const fileContent = fs.readFileSync(this.configPath, 'utf8');
        this.config = yaml.load(fileContent) as ApprovalConfig;
        console.log(`[ApprovalPolicyEngine] Loaded ${this.config.policies.length} policies from ${this.configPath}`);
      } else {
        console.warn(`[ApprovalPolicyEngine] Config file not found at ${this.configPath}. Using defaults.`);
      }
    } catch (err) {
      console.error('[ApprovalPolicyEngine] Failed to load config:', err);
    }
  }

  /**
   * Evaluates if a node should be interrupted based on the active policies.
   */
  shouldInterrupt(nodeName: string, context: RunContext, mode: ApprovalMode): boolean {
    if (!this.config) return false;

    const activePolicies = this.config.policies.filter(p => 
      p.mode === mode && 
      p.nodes.map(n => n.toLowerCase()).includes(nodeName.toLowerCase())
    );

    for (const policy of activePolicies) {
      if (this.evaluateCondition(policy.condition, context)) {
        console.log(`[ApprovalPolicyEngine] HITL Interrupt: Policy ${policy.id} matched for node ${nodeName}. ${policy.description}`);
        return true;
      }
    }

    return false;
  }

  private evaluateCondition(condition: string, context: RunContext): boolean {
    switch (condition) {
      case 'any_git_mutation':
        // Check if the agent is the git flow manager or has git skills
        return context.agent.slug === 'git-flow-manager' || 
               context.agent.skills.some(s => s.toLowerCase().includes('git'));
      
      case 'high_complexity_task':
        // Basic heuristic: check taskType or user input length/keywords
        const isComplexType = ['new-feature', 'refactor', 'bug-fix'].includes(context.task.taskType);
        const hasComplexityMarkers = context.memory.sharedFacts?.complexity === 'high' || 
                                    context.task.rawUserInput.length > 500;
        return isComplexType || hasComplexityMarkers;

      case 'ambiguous_request':
        // Check if a previous node (like research) flagged ambiguity
        return !!context.memory.sharedFacts?.is_ambiguous;

      default:
        // If condition is "always" or unknown, we might want to default to true for safety
        return condition === 'always';
    }
  }

  /**
   * Helper to resolve the mode (mostly for back compat or global overrides)
   */
  getGlobalMode(): string {
    return process.env.PILOT_APPROVAL_POLICY_MODE || this.config?.default_mode || 'git-only';
  }

  /**
   * Returns a list of nodes that should ALWAYS be interrupted before (static).
   * This is used for backward compatibility with the graph's compile() config.
   */
  getStaticInterruptBeforeNodes(): string[] {
    const override = process.env.PILOT_APPROVAL_INTERRUPT_BEFORE;
    if (override) {
      return override.split(',').map(n => n.trim().toLowerCase()).filter(Boolean);
    }
    // By default, we might not have any static interrupts if we depend on dynamic conditions.
    return [];
  }
}

/**
 * Backward compatibility export for PilotQuasiLinearGraph.ts
 */
export function resolveInterruptBeforeNodes(): string[] {
  return ApprovalPolicyEngine.getInstance().getStaticInterruptBeforeNodes();
}

