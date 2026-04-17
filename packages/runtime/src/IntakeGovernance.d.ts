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
export declare function evaluateIntakeQualityLLM(message: string, apiKey: string): Promise<IntakeEvaluation>;
export declare function evaluateIntakeQuality(message: string): IntakeEvaluation;
export declare function writeIntakeArtifact(input: IntakeArtifactInput): Promise<string>;
