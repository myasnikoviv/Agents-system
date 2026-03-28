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
  | 'conversational'    // Legacy label; mapped to PM intake pipeline
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
  'conversational': 'unified-task-intake',
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
 * Returns only explicit user directives (pipeline/agent) without running
 * heuristic or LLM intent classification.
 */
export function resolveExplicitDirectives(message: string): ClassificationResult | null {
  const explicit = parseExplicitDirectives(message);
  return explicit ? (explicit as ClassificationResult) : null;
}

/**
 * Rule-based fast classifier — runs before the LLM to handle obvious cases
 * without burning tokens.
 */
function fastClassify(message: string): ClassificationResult | null {
  const text = message.trim().toLowerCase();

  // High-signal intent keywords should win even for short prompts.
  if (/\b(bug|fix|broken|error|regression|помилка|зламалось|не\s+працює|виправ)\b/.test(text)) {
    return {
      intent: 'bug-fix',
      pipeline: 'bug-fix',
      customAgents: [],
      confidence: 0.9,
      reason: 'Bug/fix keywords detected',
      isExplicit: false,
    };
  }
  if (/\b(refactor|cleanup|restructure|tech debt|рефактор|перероб)\b/.test(text)) {
    return {
      intent: 'refactor',
      pipeline: 'refactor',
      customAgents: [],
      confidence: 0.9,
      reason: 'Refactor keywords detected',
      isExplicit: false,
    };
  }
  if (/\b(new feature|implement|add feature|нова фіча|нова функц|додай функц)\b/.test(text)) {
    return {
      intent: 'new-feature',
      pipeline: 'new-feature',
      customAgents: [],
      confidence: 0.85,
      reason: 'New feature keywords detected',
      isExplicit: false,
    };
  }

  // Operational workspace requests should go through the execution pipeline,
  // not the lightweight conversational responder.
  if (/\b(підрахуй|порахуй|count|list|find|show|перевір)\b/.test(text) &&
      /\b(файл|files?|директор|directory|корен|root|worktree|branch)\b/.test(text)) {
    return {
      intent: 'research',
      pipeline: 'unified-task-intake',
      customAgents: [],
      confidence: 0.9,
      reason: 'Operational workspace command detected',
      isExplicit: false,
    };
  }

  // NOTE: No special conversational heuristics here.
  // PM intake should decide Q&A vs execution path.

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
 * Falls back to 'unified-task-intake' pipeline if the LLM is unavailable.
 */
async function llmClassify(message: string): Promise<ClassificationResult> {
  const cfg = getCockpitExecutorConfig();
  const hasOpenAIKey = !!(cfg.openhands.apiKeys.openai || process.env.OPENAI_API_KEY);
  const hasGoogleKey = !!(cfg.openhands.apiKeys.google || process.env.GOOGLE_API_KEY);
  const prefersGoogle =
    cfg.backend === 'openhands-sdk' &&
    String(cfg.openhands.model || '').toLowerCase().startsWith('google/');

  if (!hasOpenAIKey && !hasGoogleKey) {
    // No LLM available — default to PM intake pipeline.
    return {
      intent: 'conversational',
      pipeline: 'unified-task-intake',
      customAgents: [],
      confidence: 0.5,
      reason: 'No LLM configured — defaulting to intake pipeline',
      isExplicit: false,
    };
  }

  const classifyPrompt = `You are a request router for an AI-powered software development system.
Analyze the user message and classify it into exactly one intent.

Available intents:
- conversational: Simple Q&A, greetings, status checks, asking about capabilities (legacy label; still routed through PM intake)
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

  try {
    // Prefer Gemini for classification when OpenHands+Google is active, to avoid OpenAI quota fallback.
    if (prefersGoogle && hasGoogleKey) {
      const apiKey = cfg.openhands.apiKeys.google || process.env.GOOGLE_API_KEY || '';
      const model = (cfg.openhands.model || 'google/gemini-2.5-flash').replace(/^google\//, '');
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generationConfig: { temperature: 0, maxOutputTokens: 300 },
          contents: [{ role: 'user', parts: [{ text: classifyPrompt }] }],
        }),
      });
      if (!response.ok) {
        const raw = await response.text();
        throw new Error(`Gemini HTTP ${response.status}: ${raw.slice(0, 200)}`);
      }
      const payload = await response.json() as any;
      const content = String(payload?.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
      const parsed = JSON.parse(content.replace(/```json|```/g, '').trim());
      const intent = (parsed.intent || 'new-feature') as IntentType;
      return {
        intent,
        pipeline: INTENT_TO_PIPELINE[intent] || 'unified-task-intake',
        customAgents: [],
        confidence: Number(parsed.confidence || 0.7),
        reason: String(parsed.reason || 'Gemini classification'),
        isExplicit: false,
      };
    }

    // OpenAI fallback classifier path.
    const { ChatOpenAI } = await import('@langchain/openai');
    const openaiKey = cfg.openhands.apiKeys.openai || process.env.OPENAI_API_KEY || '';
    const model = new ChatOpenAI({
      openAIApiKey: openaiKey,
      modelName: 'gpt-4o-mini',
      temperature: 0,
      maxTokens: 300,
    });

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
      intent: 'conversational',
      pipeline: 'unified-task-intake',
      customAgents: [],
      confidence: 0.5,
      reason: 'LLM classification failed — defaulting to intake pipeline',
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
