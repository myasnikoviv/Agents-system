import { DetectedLanguage } from '@system/shared';
export { DetectedLanguage };

const UKR_CHARS = /[іїєґІЇЄҐ]/;
const BEL_CHARS = /[ўЎ]/;
const CYRILLIC = /[\u0400-\u04FF]/;
const LATIN = /[A-Za-z]/;
const BEL_WORD_MARKERS = ['прывітанне', 'дзякуй', 'калі ласка', 'чаму', 'гэта', 'калі'];

function has(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

export function detectLanguage(text: string): DetectedLanguage {
  const input = String(text || '').trim();
  if (!input) return 'unknown';
  const lower = input.toLowerCase();

  if (BEL_WORD_MARKERS.some((marker) => lower.includes(marker))) return 'be';
  if (has(input, BEL_CHARS)) return 'be';
  if (has(input, UKR_CHARS)) return 'uk';
  if (has(input, CYRILLIC)) return 'ru';
  if (has(input, LATIN)) return 'en';

  return 'unknown';
}

export function languageInstructionTag(lang: DetectedLanguage): string {
  switch (lang) {
    case 'uk':
      return 'Ukrainian';
    case 'ru':
      return 'Russian';
    case 'be':
      return 'Belarusian';
    case 'en':
      return 'English';
    default:
      return 'same language as the user message';
  }
}
