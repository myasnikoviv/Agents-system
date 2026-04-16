import { ExternalExecutionInput, ExternalExecutionResult } from './ExternalExecutionAdapter';
export interface OpenHandsConversationResponse {
    conversation_id: string;
    status: string;
}
export declare class OpenHandsExecutionProvider {
    private serverUrl;
    constructor(serverUrl: string);
    checkHeartbeat(): Promise<boolean>;
    private getProviderFromModel;
    private parsePositiveInt;
    private sleep;
    private cancellableSleep;
    private throwIfCancelled;
    private shouldRetry;
    private backoffDelayMs;
    private stringifyUnknown;
    private extractErrorTextFromEvent;
    private writeDiagnostics;
    runTask(input: ExternalExecutionInput): Promise<ExternalExecutionResult>;
}
