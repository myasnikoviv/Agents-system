import fs from 'fs/promises';
import path from 'path';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { wrapLLMCall } from '@system/shared';

export interface IntakeEvaluation {
  ok: boolean;
  score: number;
  reasons: string[];
  requiredQuestions: string[];
}

export interface IntakeArtifactInput {
  ticketId: string;
  threadId: string;
  pipelineId: string;
  message: string;
  evaluation: IntakeEvaluation;
}

export async function evaluateIntakeQualityLLM(
  message: string,
  apiKey: string
): Promise<IntakeEvaluation> {
  const model = new ChatOpenAI({
    openAIApiKey: apiKey,
    modelName: 'gpt-4o',
    temperature: 0,
  });

  const prompt = ChatPromptTemplate.fromTemplate(`
    You are an Intake Governance AI. Your job is to verify if a user request is clear, actionable, and has enough context for a multi-agent swarm to execute.
    
    User Message:
    "{input}"
    
    Evaluate Based On:
    1. Clarity of the Goal (is it clear what needs to be done?)
    2. Scope (is the boundary of work defined?)
    3. Acceptance Criteria (is it clear when the task is "done"?)
    4. Technical Context (are there references to specific files, technologies, or designs?)
    
    Return a JSON object with:
    - ok: boolean (true if score >= 70)
    - score: number (0-100)
    - reasons: string[] (technical keys like "missing_scope", "vague_goal")
    - requiredQuestions: string[] (polite human-readable questions to the user to clarify the task)
    
    JSON only.
  `);

  const chain = prompt.pipe(model as any);
  const responseText = await wrapLLMCall(
    {
      runId: 'intake-governance',
      projectId: 'none',
      chainId: 'none',
      model: 'gpt-4o',
      provider: 'openai',
      source: 'guard',
    },
    message,
    async (inputText) => {
      const response = await chain.invoke({ input: inputText });
      const usage = (response as any)?.usage_metadata || {};
      return {
        response: String((response as any).content || '').trim(),
        tokensInput: Number(usage.input_tokens || 0),
        tokensOutput: Number(usage.output_tokens || 0),
      };
    }
  );
  
  try {
    const jsonStr = responseText.replace(/```json|```/g, '').trim();
    return JSON.parse(jsonStr) as IntakeEvaluation;
  } catch (e) {
    console.error('[IntakeGovernance] Failed to parse LLM response, falling back to basic evaluation.');
    return evaluateIntakeQuality(message);
  }
}

function hasAny(text: string, keywords: string[]): boolean {
  const lowered = text.toLowerCase();
  return keywords.some((kw) => lowered.includes(kw));
}

export function evaluateIntakeQuality(message: string): IntakeEvaluation {
  const text = (message || '').trim();
  const reasons: string[] = [];
  const requiredQuestions: string[] = [];
  let score = 100;

  if (text.length < 18) {
    score -= 40;
    reasons.push('message_too_short');
    requiredQuestions.push('Опиши мету задачі та очікуваний результат (мінімум 1-2 речення).');
  }

  const uiRelated = hasAny(text, ['ui', 'ux', 'design', 'інтерфейс', 'дизайн', 'layout']);
  const hasReferenceSignal = hasAny(text, ['reference', 'референс', 'codex', 'figma', 'скрін', 'screenshot']);
  if (uiRelated && !hasReferenceSignal) {
    score -= 30;
    reasons.push('ui_missing_references');
    requiredQuestions.push('Для UI задачі додай референси: скрін/посилання/Figma.');
  }

  const hasAcceptance = hasAny(text, ['acceptance', 'criteria', 'критер', 'готово коли', 'done when']);
  if (!hasAcceptance) {
    score -= 20;
    reasons.push('missing_acceptance_criteria');
    requiredQuestions.push('Додай acceptance criteria: що вважаємо успіхом.');
  }

  const hasScope = hasAny(text, ['scope', 'спринт', 'ticket', 'story', 'таск', 'issue']);
  if (!hasScope) {
    score -= 10;
    reasons.push('missing_scope_signal');
    requiredQuestions.push('Уточни scope: sprint/story/task або конкретні issue.');
  }

  // Complex requests must include structured intake intent; otherwise clarification loop is mandatory.
  const complexSignals = hasAny(text, [
    'multi-agent',
    'мультиагент',
    'pipeline',
    'пайплайн',
    'architecture',
    'архітект',
    'integrat',
    'інтеграц',
    'sprint',
    'спринт',
    'research',
    'дослідж',
    'audit',
    'ревʼю',
    'worktree',
    'branch',
    'гілк',
  ]);
  const structuredSignals = hasAny(text, [
    'context',
    'problem',
    'scope',
    'acceptance',
    'criteria',
    'done when',
    'dependency',
    'ризик',
    'gate',
    'контекст',
    'проблем',
    'критер',
    'залежн',
    'готово коли',
  ]);
  if (complexSignals && !structuredSignals) {
    score -= 25;
    reasons.push('complex_request_without_structured_intake');
    requiredQuestions.push('Задача виглядає комплексною: додай структурований intake (Context/Problem, Scope, Acceptance Criteria, Dependencies).');
  }

  return {
    ok: score >= 60,
    score: Math.max(score, 0),
    reasons,
    requiredQuestions,
  };
}

export async function writeIntakeArtifact(input: IntakeArtifactInput): Promise<string> {
  const dir = path.resolve(process.cwd(), 'docs/process/tickets');
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${input.ticketId}-intake-pack.md`);
  const lines = [
    `# Intake Pack ${input.ticketId}`,
    `- Thread: ${input.threadId}`,
    `- Pipeline: ${input.pipelineId}`,
    `- Score: ${input.evaluation.score}/100`,
    `- Status: ${input.evaluation.ok ? 'PASS' : 'BLOCKED'}`,
    `- Reasons: ${input.evaluation.reasons.join(', ') || 'none'}`,
    '',
    '## User Message',
    input.message,
    '',
    '## Required Questions',
    ...(input.evaluation.requiredQuestions.length > 0
      ? input.evaluation.requiredQuestions.map((q) => `- ${q}`)
      : ['- none']),
    '',
  ];
  await fs.writeFile(file, lines.join('\n'), 'utf-8');
  return file;
}
