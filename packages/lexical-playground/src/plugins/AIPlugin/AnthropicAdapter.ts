/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  AIAdapter,
  AIMessage,
  AIStreamEvent,
  AIToolCall,
  AIToolDefinition,
} from './types';

const DEFAULT_BASE_URL = '/api/ai';
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

/**
 * Anthropic AI adapter that calls the Claude Messages API.
 *
 * Configure `baseURL` to point at your API endpoint or proxy.
 * The default `/api/ai` path is handled by the Vite dev server proxy
 * when `VITE_AI_PROXY_TARGET` is set.
 */
export class AnthropicAdapter implements AIAdapter {
  private baseURL: string;
  private model: string;
  private apiKey: string;

  constructor(options?: {baseURL?: string; model?: string; apiKey?: string}) {
    this.baseURL =
      (options != null ? options.baseURL : undefined) || DEFAULT_BASE_URL;
    this.model = (options != null ? options.model : undefined) || DEFAULT_MODEL;
    this.apiKey = (options != null ? options.apiKey : undefined) || '';
  }

  async *sendMessage(params: {
    systemPrompt: string;
    messages: AIMessage[];
    tools: AIToolDefinition[];
    signal?: AbortSignal;
  }): AsyncIterable<AIStreamEvent> {
    const anthropicMessages = this.convertMessages(params.messages);
    const anthropicTools = params.tools.map((t) => ({
      description: t.description,
      input_schema: t.input_schema,
      name: t.name,
    }));

    const body: Record<string, unknown> = {
      max_tokens: 4096,
      messages: anthropicMessages,
      model: this.model,
      stream: false,
      system: params.systemPrompt,
      temperature: 0.3,
    };

    if (anthropicTools.length > 0) {
      body.tools = anthropicTools;
    }

    const url = `${this.baseURL}/v1/messages`;

    const headers: Record<string, string> = {
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    };
    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        body: JSON.stringify(body),
        headers,
        method: 'POST',
        signal: params.signal,
      });
    } catch (fetchError) {
      yield {
        error:
          fetchError instanceof Error
            ? fetchError
            : new Error(String(fetchError)),
        type: 'error',
      };
      return;
    }

    if (!response.ok) {
      const errorText = await response.text();
      yield {
        error: new Error(`API error ${response.status}: ${errorText}`),
        type: 'error',
      };
      return;
    }

    const result = await response.json();
    const toolCalls: AIToolCall[] = [];
    let fullText = '';

    for (const block of result.content || []) {
      if (block.type === 'text') {
        fullText += block.text;
        yield {delta: block.text, type: 'text_delta'};
      } else if (block.type === 'tool_use') {
        const toolCall: AIToolCall = {
          id: block.id,
          input: block.input || {},
          name: block.name,
        };
        toolCalls.push(toolCall);
        yield {toolCall, type: 'tool_call'};
      }
    }

    yield {
      message: {
        content: fullText,
        role: 'assistant',
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      },
      type: 'message_complete',
    };
  }

  private convertMessages(
    messages: AIMessage[],
  ): Array<{role: string; content: unknown}> {
    return messages.map((msg) => {
      if (msg.toolResults && msg.toolResults.length > 0) {
        return {
          content: msg.toolResults.map(
            (tr: {toolCallId: string; result: string}) => ({
              content: tr.result,
              tool_use_id: tr.toolCallId,
              type: 'tool_result',
            }),
          ),
          role: 'user',
        };
      }

      if (msg.toolCalls && msg.toolCalls.length > 0) {
        const content: unknown[] = [];
        if (msg.content) {
          content.push({text: msg.content, type: 'text'});
        }
        for (const tc of msg.toolCalls) {
          content.push({
            id: tc.id,
            input: tc.input,
            name: tc.name,
            type: 'tool_use',
          });
        }
        return {content, role: 'assistant'};
      }

      return {content: msg.content, role: msg.role};
    });
  }
}
