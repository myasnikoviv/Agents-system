import { DetectedLanguage } from './LanguageDetection';

export interface ResponseContractValidationResult {
  ok: boolean;
  errors: string[];
  normalizedText: string;
}

const REQUIRED_HEADERS = ['Active role', 'Pipeline', 'Stage', 'Next', 'Ticket', 'Git'];

function hasHeader(text: string, header: string): boolean {
  const escaped = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^\\s*(?:\\*\\*)?${escaped}(?:\\*\\*)?\\s*:`, 'im');
  return pattern.test(text);
}

function extractTicketValue(text: string): string {
  const line = text
    .split('\n')
    .find((entry) => /^\s*(?:\*\*)?ticket(?:\*\*)?\s*:/i.test(entry));
  if (!line) return '';
  return line.replace(/^\s*(?:\*\*)?ticket(?:\*\*)?\s*:/i, '').trim();
}

function isSyntheticTicket(value: string): boolean {
  const ticket = String(value || '').trim();
  if (!ticket || /^n\/a$/i.test(ticket)) return false;
  return /^thread[-_:]/i.test(ticket) || /^chat[-_:]/i.test(ticket);
}

export function validateAgentResponseContract(raw: string): ResponseContractValidationResult {
  const normalizedText = String(raw || '').trim();
  if (!normalizedText) {
    return { ok: false, errors: ['Empty response'], normalizedText };
  }

  const errors: string[] = [];

  for (const header of REQUIRED_HEADERS) {
    if (!hasHeader(normalizedText, header)) {
      errors.push(`Missing header: ${header}`);
    }
  }

  const ticketValue = extractTicketValue(normalizedText);
  if (isSyntheticTicket(ticketValue)) {
    errors.push('Ticket header contains synthetic ID; use real ticket ID or "N/A"');
  }

  return {
    ok: errors.length === 0,
    errors,
    normalizedText,
  };
}

function joinErrors(errors: string[]): string {
  return errors.map((error, idx) => `${idx + 1}. ${error}`).join('\n');
}

export function buildContractRepromptInstruction(
  language: DetectedLanguage,
  errors: string[],
  previousResponse: string
): string {
  const issueList = joinErrors(errors);
  const clippedPrev = String(previousResponse || '').trim().slice(0, 2000);

  if (language === 'uk') {
    return [
      'Переформатуй відповідь за контрактом AGENTS.md.',
      'Обовʼязково включи заголовки рівно в такому форматі:',
      'Active role:',
      'Pipeline:',
      'Stage:',
      'Next:',
      'Ticket:',
      'Git:',
      '',
      'Критичні помилки попередньої відповіді:',
      issueList,
      '',
      'Не вигадуй Ticket. Якщо немає реального ID, став "Ticket: N/A".',
      'Поверни лише фінальну відповідь у виправленому форматі.',
      '',
      'Попередня відповідь:',
      clippedPrev,
    ].join('\n');
  }

  if (language === 'ru') {
    return [
      'Переформатируй ответ по контракту AGENTS.md.',
      'Обязательно включи заголовки ровно в таком формате:',
      'Active role:',
      'Pipeline:',
      'Stage:',
      'Next:',
      'Ticket:',
      'Git:',
      '',
      'Критичные ошибки предыдущего ответа:',
      issueList,
      '',
      'Не выдумывай Ticket. Если нет реального ID, ставь "Ticket: N/A".',
      'Верни только финальный ответ в исправленном формате.',
      '',
      'Предыдущий ответ:',
      clippedPrev,
    ].join('\n');
  }

  if (language === 'be') {
    return [
      'Перафарматуй адказ паводле кантракта AGENTS.md.',
      'Абавязкова ўключы загалоўкі дакладна ў такім фармаце:',
      'Active role:',
      'Pipeline:',
      'Stage:',
      'Next:',
      'Ticket:',
      'Git:',
      '',
      'Крытычныя памылкі папярэдняга адказу:',
      issueList,
      '',
      'Не прыдумляй Ticket. Калі няма рэальнага ID, ставь "Ticket: N/A".',
      'Вярні толькі фінальны адказ у выпраўленым фармаце.',
      '',
      'Папярэдні адказ:',
      clippedPrev,
    ].join('\n');
  }

  return [
    'Reformat your response to comply with the AGENTS.md contract.',
    'You must include these headers exactly:',
    'Active role:',
    'Pipeline:',
    'Stage:',
    'Next:',
    'Ticket:',
    'Git:',
    '',
    'Contract validation errors:',
    issueList,
    '',
    'Do not invent Ticket IDs. Use "Ticket: N/A" when no real ticket exists.',
    'Return only the corrected final response.',
    '',
    'Previous response:',
    clippedPrev,
  ].join('\n');
}
