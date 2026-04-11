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
  AIToolDefinition,
} from '@lexical/ai';

/**
 * Mock AI adapter that simulates an LLM with tool-calling capability.
 * It parses user prompts for simple edit commands and calls the appropriate tools.
 *
 * In a real application, this would call an actual LLM API (Claude, GPT, etc.).
 */
export class MockAIAdapter implements AIAdapter {
  async *sendMessage(params: {
    systemPrompt: string;
    messages: AIMessage[];
    tools: AIToolDefinition[];
    signal?: AbortSignal;
  }): AsyncIterable<AIStreamEvent> {
    const lastUserMsg = [...params.messages]
      .reverse()
      .find((m) => m.role === 'user');

    if (!lastUserMsg) {
      yield* this.streamText('No message received.');
      return;
    }

    // Check if this is a tool result follow-up
    if (lastUserMsg.toolResults && lastUserMsg.toolResults.length > 0) {
      const results = lastUserMsg.toolResults
        .map((r: {toolCallId: string; result: string}) => {
          try {
            const parsed = JSON.parse(r.result);
            return parsed.message || r.result;
          } catch {
            return r.result;
          }
        })
        .join('\n');
      yield* this.streamText(`Done! ${results}`);
      return;
    }

    const content = lastUserMsg.content.toLowerCase();

    // Parse commands and emit tool calls
    if (
      content.includes('get') &&
      (content.includes('document') || content.includes('doc'))
    ) {
      yield {
        toolCall: {
          id: `call_${Date.now()}`,
          input: {},
          name: 'get_document',
        },
        type: 'tool_call',
      };
      yield {
        message: {
          content: '',
          role: 'assistant',
          toolCalls: [
            {id: `call_${Date.now()}`, input: {}, name: 'get_document'},
          ],
        },
        type: 'message_complete',
      };
      return;
    }

    if (content.includes('replace') || content.includes('替换')) {
      const replaceMatch = content.match(
        /(?:replace|替换)\s*["""](.+?)["""]\s*(?:with|to|为|成)\s*["""](.+?)["""]/i,
      );
      if (replaceMatch) {
        const toolCall = {
          id: `call_${Date.now()}`,
          input: {replace: replaceMatch[2], search: replaceMatch[1]},
          name: 'replace_text',
        };
        yield {toolCall, type: 'tool_call'};
        yield {
          message: {
            content: '',
            role: 'assistant',
            toolCalls: [toolCall],
          },
          type: 'message_complete',
        };
        return;
      }
    }

    if (
      content.includes('insert') ||
      content.includes('add') ||
      content.includes('插入') ||
      content.includes('添加')
    ) {
      const insertMatch = content.match(
        /(?:insert|add|插入|添加)\s*["""](.+?)["""]\s*(?:after|在)\s*["""](.+?)["""]/i,
      );
      if (insertMatch) {
        const toolCall = {
          id: `call_${Date.now()}`,
          input: {after_text: insertMatch[2], new_text: insertMatch[1]},
          name: 'insert_paragraph_after',
        };
        yield {toolCall, type: 'tool_call'};
        yield {
          message: {
            content: '',
            role: 'assistant',
            toolCalls: [toolCall],
          },
          type: 'message_complete',
        };
        return;
      }
    }

    if (
      content.includes('delete') ||
      content.includes('remove') ||
      content.includes('删除')
    ) {
      const deleteMatch = content.match(
        /(?:delete|remove|删除)\s*(?:paragraph\s*(?:containing)?|the\s*paragraph\s*with|包含)?\s*["""](.+?)["""]/i,
      );
      if (deleteMatch) {
        const toolCall = {
          id: `call_${Date.now()}`,
          input: {containing_text: deleteMatch[1]},
          name: 'delete_paragraph',
        };
        yield {toolCall, type: 'tool_call'};
        yield {
          message: {
            content: '',
            role: 'assistant',
            toolCalls: [toolCall],
          },
          type: 'message_complete',
        };
        return;
      }
    }

    if (content.includes('bold') || content.includes('加粗')) {
      const boldMatch = content.match(/(?:bold|加粗)\s*["""](.+?)["""]/i);
      if (boldMatch) {
        const toolCall = {
          id: `call_${Date.now()}`,
          input: {
            containing_text: boldMatch[1],
            format: 'bold',
            text_to_format: boldMatch[1],
          },
          name: 'format_text',
        };
        yield {toolCall, type: 'tool_call'};
        yield {
          message: {
            content: '',
            role: 'assistant',
            toolCalls: [toolCall],
          },
          type: 'message_complete',
        };
        return;
      }
    }

    // Default: stream a helpful response
    yield* this.streamText(
      `I'm the AI editor assistant (mock mode). I can help you edit the document. Try commands like:\n\n` +
        `- Replace "old text" with "new text"\n` +
        `- Insert "new paragraph" after "existing text"\n` +
        `- Delete "text to remove"\n` +
        `- Bold "text to bold"\n` +
        `- Get document\n\n` +
        `In production, connect a real AI adapter (Claude, GPT, etc.) for full natural language understanding.`,
    );
  }

  private async *streamText(text: string): AsyncIterable<AIStreamEvent> {
    // Simulate streaming by yielding chunks
    const chunkSize = 3;
    for (let i = 0; i < text.length; i += chunkSize) {
      const chunk = text.slice(i, i + chunkSize);
      yield {delta: chunk, type: 'text_delta'};
      // Small delay to simulate streaming
      await new Promise((resolve) => setTimeout(resolve, 15));
    }
    yield {
      message: {content: text, role: 'assistant'},
      type: 'message_complete',
    };
  }
}
