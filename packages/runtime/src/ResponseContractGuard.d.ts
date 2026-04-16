import { DetectedLanguage } from './LanguageDetection';
export interface ResponseContractValidationResult {
    ok: boolean;
    errors: string[];
    normalizedText: string;
}
export declare function normalizeContractResponse(raw: string): string;
export declare function validateAgentResponseContract(raw: string): ResponseContractValidationResult;
export declare function buildContractRepromptInstruction(language: DetectedLanguage, errors: string[], previousResponse: string): string;
