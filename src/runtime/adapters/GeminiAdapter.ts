import axios from 'axios';
import { ExecutionAdapter, ExecutionResult } from './ExecutionAdapter';
import { RunContext } from '../context/RunContext';
import { ExecutionPayloadCompiler } from '../context/ExecutionPayloadCompiler';

export class GeminiAdapter implements ExecutionAdapter {
  private apiKey: string;
  private modelName: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

  constructor(apiKey: string, modelName: string = 'gemini-1.5-flash') {
    this.apiKey = apiKey;
    this.modelName = modelName;
  }

  compilePayload(context: RunContext): any {
    return ExecutionPayloadCompiler.compile(context);
  }

  async execute(context: RunContext): Promise<ExecutionResult> {
    const payload = this.compilePayload(context);
    
    const contents: any[] = [];
    
    // System instruction is separate in Gemini
    const systemInstruction = {
      role: 'system',
      parts: [{ text: payload.systemPrompt }]
    };

    // Group history by role to satisfy Gemini's strict turn sequence
    let currentRole: string | null = null;
    let currentParts: any[] = [];

    const flush = () => {
      if (currentParts.length > 0) {
        contents.push({ role: currentRole, parts: currentParts });
        currentParts = [];
      }
    };

    const history = (payload.memory.threadHistory as any[]);
    
    // Add initial user prompt if history doesn't start with it
    if (history.length === 0 || (history[0].role !== 'user' && history[0].role !== 'system')) {
      contents.push({ role: 'user', parts: [{ text: payload.userPrompt }] });
    }

    history.forEach(m => {
      if (m.role === 'user') {
        flush();
        currentRole = 'user';
        currentParts = [{ text: m.content }];
      } else if (m.role === 'assistant') {
        flush();
        currentRole = 'model';
        if (m.rawParts) {
          currentParts = m.rawParts;
        } else {
          if (m.content) currentParts.push({ text: m.content });
          if (m.tool_calls) {
            m.tool_calls.forEach((tc: any) => {
              currentParts.push({
                functionCall: { name: tc.tool, args: tc.args }
              });
            });
          }
        }
      } else if (m.role === 'observation') {
        // Observations must be role 'user' in Gemini REST and follow a 'model' turn
        // If we were already in a 'user' turn (e.g. from previous observation), we append
        if (currentRole !== 'user') {
          flush();
          currentRole = 'user';
        }
        currentParts.push({
          functionResponse: {
            name: m.tool_name || 'unknown',
            response: { content: m.content }
          }
        });
      }
    });
    flush();

    // Tools
    const tools: any[] = [];
    if (context.tools && context.tools.length > 0) {
      tools.push({
        function_declarations: context.tools.map(t => ({
          name: t.name,
          description: t.description,
          parameters: t.schema || { type: 'object', properties: {} }
        }))
      });
    }

    const url = `${this.baseUrl}/${this.modelName}:generateContent?key=${this.apiKey}`;
    
    try {
      const response = await axios.post(url, {
        contents,
        system_instruction: systemInstruction,
        tools
      });

      const candidate = response.data.candidates?.[0];
      const parts = candidate?.content?.parts || [];
      const toolCalls = [];
      let finalContent = '';

      for (const p of parts) {
        if (p.functionCall) {
          toolCalls.push({
            tool: p.functionCall.name,
            args: p.functionCall.args,
            id: `gemini_${Date.now()}_${toolCalls.length}`
          });
        }
        if (p.text) {
          finalContent += p.text;
        }
      }

      return {
        ok: true,
        content: finalContent || '',
        responseMode: toolCalls.length > 0 ? 'tool_call' : 'final',
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        rawParts: parts,
        usage: {
          inputTokens: response.data.usageMetadata?.promptTokenCount || 0,
          outputTokens: response.data.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: response.data.usageMetadata?.totalTokenCount || 0
        }
      };
    } catch (e: any) {
      console.error('[GeminiAdapter] Error:', e.response?.data || e.message);
      return {
        ok: false,
        content: '',
        error: e.response?.data?.error?.message || e.message
      };
    }
  }
}
