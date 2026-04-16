import { DetectedLanguage } from '@system/shared';
export { DetectedLanguage };
export declare function detectLanguage(text: string): DetectedLanguage;
export declare function languageInstructionTag(lang: DetectedLanguage): string;
