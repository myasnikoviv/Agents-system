import { RunContext } from './context/RunContext';
import { ExecutionAdapter, ExecutionResult } from './adapters/ExecutionAdapter';
export declare class AgentExecutor {
    constructor();
    private resolveBackendFromContext;
    private loadProviderPolicy;
    private resolveExecutionChain;
    private createAdapter;
    private applyBackendContext;
    run(context: RunContext, providedAdapter?: ExecutionAdapter): Promise<ExecutionResult>;
    private emitTelemetry;
}
