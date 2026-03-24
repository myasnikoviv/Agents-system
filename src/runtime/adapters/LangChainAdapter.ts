import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate, SystemMessagePromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { SystemMessage, HumanMessage, AIMessage, ToolMessage } from '@langchain/core/messages';
import { ExecutionAdapter, ExecutionResult } from './ExecutionAdapter';
import { RunContext } from '../context/RunContext';
import { SystemPromptGenerator } from '../context/SystemPromptGenerator';
import { ExecutionPayload, ExecutionPayloadCompiler } from '../context/ExecutionPayloadCompiler';
import { ToolDefinition } from '../ToolDiscoveryService';

export class LangChainAdapter implements ExecutionAdapter {
  private model: ChatOpenAI;

  constructor(apiKey: string, modelName: string = 'gpt-4o') {
    this.model = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName,
      temperature: 0.2,
    });
  }

  compilePayload(context: RunContext): ExecutionPayload {
    return ExecutionPayloadCompiler.compile(context);
  }

  async execute(context: RunContext): Promise<ExecutionResult> {
    const payload = this.compilePayload(context);
    
    const messages: any[] = [
      new SystemMessage(payload.systemPrompt),
      ...(payload.memory.threadHistory as any[]).map(m => {
        if (m.role === 'user') return new HumanMessage(m.content);
        if (m.role === 'observation') {
          return new ToolMessage({
            content: m.content,
            tool_call_id: (m as any).tool_call_id || 'manual_id'
          });
        }
        return new AIMessage(m.content);
      }),
      new HumanMessage(payload.userPrompt)
    ];

    try {
      // Sprint B: Bind Tools to Model
      let modelWithTools = this.model;
      if (context.tools && context.tools.length > 0) {
        // Convert ToolDefinition to LangChain OpenAI Tool schema
        const toolSchemas = context.tools.map(t => ({
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: t.schema || { type: 'object', properties: {} }
          }
        }));
        modelWithTools = this.model.bindTools(toolSchemas as any) as any;
      }

      const response: any = await modelWithTools.invoke(messages);
      const usage = response?.usage_metadata || {};
      
      const toolCalls = (response.tool_calls || []).map((tc: any) => ({
        tool: tc.name,
        args: tc.args,
        id: tc.id
      }));

      return {
        ok: true,
        content: response.content as string,
        responseMode: toolCalls.length > 0 ? 'tool_call' : 'final',
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        usage: {
          inputTokens: usage.input_tokens || 0,
          outputTokens: usage.output_tokens || 0,
          totalTokens: usage.total_tokens || 0
        }
      };
    } catch (e: any) {
      return {
        ok: false,
        content: '',
        error: e.message || 'LangChain execution failed'
      };
    }
  }
}
