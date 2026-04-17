import { RunContext } from '../context/RunContext';
import { ExecutionPayload } from '../context/ExecutionPayloadCompiler';

export interface ExecutionResult {
  ok: boolean;
  content: string;
  error?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  // Sprint A: Structured fields for Blackboard
  findings?: string[];
  decisions?: string[];
  responseMode?: 'handoff' | 'final' | 'clarify' | 'tool_call';
  toolCalls?: Array<{
    tool: string;
    args: any;
    id?: string;
  }>;
  rawParts?: any[];
}

export interface ExecutionAdapter {
  compilePayload(context: RunContext): ExecutionPayload;
  execute(context: RunContext): Promise<ExecutionResult>;
}
