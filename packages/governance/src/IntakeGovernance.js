"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateIntakeQualityLLM = evaluateIntakeQualityLLM;
exports.evaluateIntakeQuality = evaluateIntakeQuality;
exports.writeIntakeArtifact = writeIntakeArtifact;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const openai_1 = require("@langchain/openai");
const prompts_1 = require("@langchain/core/prompts");
const shared_1 = require("@system/shared");
async function evaluateIntakeQualityLLM(message, apiKey) {
    const model = new openai_1.ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: 'gpt-4o',
        temperature: 0,
    });
    const prompt = prompts_1.ChatPromptTemplate.fromTemplate(`
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
    const chain = prompt.pipe(model);
    const responseText = await (0, shared_1.wrapLLMCall)({
        runId: 'intake-governance',
        projectId: 'none',
        chainId: 'none',
        model: 'gpt-4o',
        provider: 'openai',
        source: 'guard',
    }, message, async (inputText) => {
        const response = await chain.invoke({ input: inputText });
        const usage = response?.usage_metadata || {};
        return {
            response: String(response.content || '').trim(),
            tokensInput: Number(usage.input_tokens || 0),
            tokensOutput: Number(usage.output_tokens || 0),
        };
    });
    try {
        const jsonStr = responseText.replace(/```json|```/g, '').trim();
        return JSON.parse(jsonStr);
    }
    catch (e) {
        console.error('[IntakeGovernance] Failed to parse LLM response, falling back to basic evaluation.');
        return evaluateIntakeQuality(message);
    }
}
function hasAny(text, keywords) {
    const lowered = text.toLowerCase();
    return keywords.some((kw) => lowered.includes(kw));
}
function evaluateIntakeQuality(message) {
    const text = (message || '').trim();
    const reasons = [];
    const requiredQuestions = [];
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
async function writeIntakeArtifact(input) {
    const dir = path_1.default.resolve(process.cwd(), 'docs/process/tickets');
    await promises_1.default.mkdir(dir, { recursive: true });
    const file = path_1.default.join(dir, `${input.ticketId}-intake-pack.md`);
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
    await promises_1.default.writeFile(file, lines.join('\n'), 'utf-8');
    return file;
}
