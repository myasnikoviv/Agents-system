/**
 * IntakeClassifier — LLM-based request router for the Cockpit agent system.
 *
 * Analyzes incoming user messages and returns structured routing intent.
 * Supports:
 * - Conversational Q&A
 * - Standard pipelines (new-feature, bug-fix, refactor, etc.)
 * - Custom agent composition (e.g. "Use only the Developer and QA agents")
 * - Meta-language directives (e.g. "pipeline: bug-fix", "agent: developer, qa")
 */

import { getCockpitExecutorConfig } from './CockpitExecutorConfig';

export type IntentType =
  | 'conversational'    // Simple Q&A, greetings, status checks
  | 'new-feature'       // Implementing a new feature
  | 'bug-fix'           // Fixing a bug
  | 'refactor'          // Code refactoring
  | 'research'          // Research / analysis only
  | 'strategy-tuning'   // Trading strategy research/tuning
  | 'design-audit'      // Design review
  | 'custom'            // User specified custom agent set
  | 'unknown';          // Fallback

export interface ClassificationResult {
  intent: IntentType;
  pipeline: string;
  /** For 'custom' intent: ordered list of agent slugs to run */
  customAgents: string[];
  confidence: number;
  reason: string;
  /** Whether the user explicitly specified a pipeline/agent in the message */
  isExplicit: boolean;
}

/** All agent slugs available in the system */
const KNOWN_AGENTS = [
  'pm-orchestrator',
  'research-agent',
  'trader-analyst',
  'solution-architect',
  'tdd-qa',
  'developer',
  'code-reviewer',
  'runner-backtest',
  'knowledge-curator',
  'domain-validator',
  'git-flow-manager',
  'documentation-owner',
  'devops-engineer',
  'design-lead',
];

/** Maps intent to pipeline id used in logs */
const INTENT_TO_PIPELINE: Record<IntentType, string> = {
  'conversational': 'conversational',
  'new-feature': 'new-feature',
  'bug-fix': 'bug-fix',
  'refactor': 'refactor',
  'research': 'unified-task-intake',
  'strategy-tuning': 'strategy-tuning',
  'design-audit': 'design-audit',
  'custom': 'custom',
  'unknown': 'unified-task-intake',
};

/**
 * Fast path: parse explicit meta-language directives from the message.
 * Supports:
 *   - "pipeline: bug-fix"
 *   - "agent: developer, qa"
 *   - "пайплайн: new-feature"
 *   - "агенти: developer researcher"
 */
function parseExplicitDirectives(message: string): Partial<ClassificationResult> | null {
  const text = message.toLowerCase();

  // Pipeline directive
  const pipelineMatch = text.match(/(?:pipeline|пайплайн)\s*[:=]\s*([a-z\-а-яіїєё]+)/i);
  if (pipelineMatch) {
    const pipelineHint = pipelineMatch[1]!.trim();
    const intentMap: Record<string, IntentType> = {
      'new-feature': 'new-feature',
      'bug-fix': 'bug-fix',
      'bugfix': 'bug-fix',
      'refactor': 'refactor',
      'research': 'research',
      'conversational': 'conversational',
      'strategy': 'strategy-tuning',
      'strategy-tuning': 'strategy-tuning',
      'design-audit': 'design-audit',
      'design': 'design-audit',
    };
    const intent = intentMap[pipelineHint] || 'unknown';
    return {
      intent,
      pipeline: INTENT_TO_PIPELINE[intent],
      customAgents: [],
      confidence: 1.0,
      reason: `Explicit pipeline directive: ${pipelineHint}`,
      isExplicit: true,
    };
  }

  // Agent directive
  const agentMatch = text.match(/(?:agent|agents|агент|агенти)\s*[:=]\s*([a-z,\s\-а-яіїєё]+)/i);
  if (agentMatch) {
    const agentList = agentMatch[1]!
      .split(/[\s,]+/)
      .map(a => a.trim())
      .filter(a => a.length > 0)
      .map(a => {
        // Map friendly names to slugs
        const nameMap: Record<string, string> = {
          'developer': 'developer',
          'dev': 'developer',
          'qa': 'tdd-qa',
          'tdd-qa': 'tdd-qa',
          'pm': 'pm-orchestrator',
          'research': 'research-agent',
          'researcher': 'research-agent',
          'architect': 'solution-architect',
          'trader': 'trader-analyst',
          'reviewer': 'code-reviewer',
          'runner': 'runner-backtest',
          'git': 'git-flow-manager',
          'docs': 'documentation-owner',
          'devops': 'devops-engineer',
          'design': 'design-lead',
          'domain': 'domain-validator',
        };
        return nameMap[a] || a;
      })
      .filter(a => KNOWN_AGENTS.includes(a));

    if (agentList.length > 0) {
      return {
        intent: 'custom',
        pipeline: 'custom',
        customAgents: agentList,
        confidence: 1.0,
        reason: `Explicit agent directive: ${agentList.join(', ')}`,
        isExplicit: true,
      };
    }
  }

  return null;
}

/**
 * Rule-based fast classifier — runs before the LLM to handle obvious cases
 * without burning tokens.
 */
function fastClassify(message: string): ClassificationResult | null {
  const text = message.trim().toLowerCase();

  // Very short messages → always conversational
  if (text.length < 30) {
    return {
      intent: 'conversational',
      pipeline: 'conversational',
      customAgents: [],
      confidence: 0.95,
      reason: 'Short message (< 30 chars)',
      isExplicit: false,
    };
  }

  // Greeting / thanks patterns
  if (/^(привіт|hello|hi|hey|дякую|thanks?|thank you|ок|окей|добре)/.test(text)) {
    return {
      intent: 'conversational',
      pipeline: 'conversational',
      customAgents: [],
      confidence: 0.99,
      reason: 'Greeting or acknowledgement pattern',
      isExplicit: false,
    };
  }

  // Question patterns → conversational
  const questionPatterns = [
    /\?$/,
    /^(що|як|чи|де|хто|яка|які|скільки|чому|навіщо|коли)\b/,
    /^(what|how|why|when|where|who|which|is|are|can|do|does|did|has|have)\b/,
    /^(перевір|покажи|розкажи|поясни|explain|show|list|check|tell|describe)\b/,
    /чи (ти|ви|маєш|маєте)\b/,
    /доступ до проект/,
  ];
  if (questionPatterns.some(p => p.test(text)) && text.length < 120) {
    return {
      intent: 'conversational',
      pipeline: 'conversational',
      customAgents: [],
      confidence: 0.85,
      reason: 'Question pattern matched',
      isExplicit: false,
    };
  }

  // Strategy/trading keywords → strategy-tuning
  if (/\b(стратег|backtest|strategy|backtesting|trading|сигнал|signal|індикатор|indicator)\b/.test(text)) {
    return {
      intent: 'strategy-tuning',
      pipeline: 'strategy-tuning',
      customAgents: [],
      confidence: 0.80,
      reason: 'Strategy/trading keywords detected',
      isExplicit: false,
    };
  }

  return null; // Could not classify quickly — defer to LLM
}

/**
 * LLM-powered classifier — calls the configured LLM to analyze the message.
 * Falls back to 'new-feature' pipeline if the LLM is unavailable.
 */
async function llmClassify(message: string): Promise<ClassificationResult> {
  const cfg = getCockpitExecutorConfig();
  const hasKey =
    !!cfg.openhands.apiKeys.openai ||
    !!cfg.openhands.apiKeys.anthropic ||
    !!cfg.openhands.apiKeys.google ||
    !!process.env.OPENAI_API_KEY;

  if (!hasKey) {
    // No LLM available — default to new-feature for longer messages
    return {
      intent: 'new-feature',
      pipeline: 'new-feature',
      customAgents: [],
      confidence: 0.5,
      reason: 'No LLM configured — defaulting to new-feature pipeline',
      isExplicit: false,
    };
  }

  try {
    // Use langchain directly for the classification call (lightweight, no agent overhead)
    const { ChatOpenAI } = await import('@langchain/openai');
    const openaiKey = cfg.openhands.apiKeys.openai || process.env.OPENAI_API_KEY || '';
    const model = new ChatOpenAI({
      openAIApiKey: openaiKey,
      modelName: 'gpt-4o-mini', // Fast and cheap for classification
      temperature: 0,
      maxTokens: 300,
    });

    const classifyPrompt = `You are a request router for an AI-powered software development system.
Analyze the user message and classify it into exactly one intent.

Available intents:
- conversational: Simple Q&A, greetings, status checks, asking about capabilities
- new-feature: Implementing a new feature or functionality  
- bug-fix: Fixing a bug or error
- refactor: Code refactoring or restructuring
- research: Research, analysis, investigation only
- strategy-tuning: Trading strategy analysis, backtesting, tuning
- design-audit: UI/UX design review or audit
- custom: User explicitly wants specific agents/steps

Respond ONLY with a JSON object, no markdown:
{"intent": "<one of the intents above>", "confidence": 0.0-1.0, "reason": "<brief explanation>"}

User message: "${message.replace(/"/g, "'")}"`;

    const response = await model.invoke(classifyPrompt);
    const content = String(response.content || '').trim();

    // Parse JSON response
    const parsed = JSON.parse(content.replace(/```json|```/g, '').trim());
    const intent = (parsed.intent || 'new-feature') as IntentType;

    return {
      intent,
      pipeline: INTENT_TO_PIPELINE[intent] || 'unified-task-intake',
      customAgents: [],
      confidence: Number(parsed.confidence || 0.7),
      reason: String(parsed.reason || 'LLM classification'),
      isExplicit: false,
    };
  } catch (e: any) {
    console.warn('[IntakeClassifier] LLM classification failed:', e.message);
    return {
      intent: 'new-feature',
      pipeline: 'new-feature',
      customAgents: [],
      confidence: 0.5,
      reason: `LLM classification failed (${e.message}) — defaulting to new-feature`,
      isExplicit: false,
    };
  }
}

/**
 * Main entry point: classify a user message.
 *
 * Priority:
 * 1. Explicit meta-language directives (pipeline: X, agent: Y)
 * 2. Fast rule-based classification
 * 3. LLM-based classification (if rules don't match)
 */
export async function classifyRequest(message: string): Promise<ClassificationResult> {
  // 1. Check for explicit directives first
  const explicit = parseExplicitDirectives(message);
  if (explicit) {
    return explicit as ClassificationResult;
  }

  // 2. Fast rule-based check
  const fast = fastClassify(message);
  if (fast && fast.confidence >= 0.85) {
    return fast;
  }

  // 3. LLM classification (most accurate but uses tokens)
  const llmResult = await llmClassify(message);

  // If fast classification gave a partial result (lower confidence), merge/compare
  if (fast && fast.confidence > llmResult.confidence) {
    return fast;
  }

  return llmResult;
}
