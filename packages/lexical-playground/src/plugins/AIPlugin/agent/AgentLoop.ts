/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  AgentEvent,
  AIAdapter,
  AIMessage,
  AIToolCall,
  AIToolDefinition,
  CustomToolRegistration,
  ToolExecutionResult,
} from '../types';
import type {ContextManagerConfig} from './ContextManager';
import type {LexicalEditor} from 'lexical';

import {BUILT_IN_TOOL_DEFINITIONS} from '../tools/definitions';
import {createToolExecutor} from '../tools/executor';
import {
  DEFAULT_CONTEXT_CONFIG,
  estimateTokens,
  manageContext,
} from './ContextManager';

const DEFAULT_SYSTEM_PROMPT = `You are an AI assistant integrated into a rich text editor. You can read and modify the document using the provided tools.

When the user asks you to edit the document, you MUST call the appropriate tool to make the change. Do not just describe what should be changed — actually execute the edit using tool calls.

Before editing, use get_document to understand the current document structure. Use the text content from the document to target specific paragraphs for editing.

Guidelines:
- Always use exact text from get_document results when targeting paragraphs
- For multiple edits, execute them sequentially
- After making edits, summarize what was changed
- If you cannot find the target text, inform the user
- Respond in the same language as the user's message`;

export interface AgentLoopOptions {
  adapter: AIAdapter;
  editor: LexicalEditor;
  systemPrompt?: string;
  maxTurns?: number;
  customTools?: CustomToolRegistration[];
  contextConfig?: Partial<ContextManagerConfig>;
  onEvent: (event: AgentEvent) => void;
}

function serializeToolResult(result: ToolExecutionResult): string {
  if (result.data != null) {
    const dataStr = JSON.stringify(result.data);
    if (dataStr.length <= 2000) {
      return JSON.stringify(result);
    }
    return JSON.stringify({
      message: result.message,
      note: `Data omitted from history (${dataStr.length} chars). Call the tool again for current data.`,
      success: result.success,
    });
  }
  return JSON.stringify({message: result.message, success: result.success});
}

export async function runAgentLoop(
  prompt: string,
  options: AgentLoopOptions & {signal?: AbortSignal},
): Promise<string> {
  const {
    adapter,
    editor,
    systemPrompt = DEFAULT_SYSTEM_PROMPT,
    maxTurns = 15,
    customTools = [],
    onEvent,
    signal,
  } = options;

  const contextConfig: ContextManagerConfig = {
    ...DEFAULT_CONTEXT_CONFIG,
    ...options.contextConfig,
  };

  const toolExecutor = createToolExecutor(editor);

  const allToolDefinitions: AIToolDefinition[] = [
    ...BUILT_IN_TOOL_DEFINITIONS,
    ...customTools.map((ct) => ct.definition),
  ];

  const customToolExecutors = new Map<
    string,
    (input: Record<string, unknown>) => string | Promise<string>
  >();
  for (const ct of customTools) {
    customToolExecutors.set(ct.definition.name, ct.executor);
  }

  const systemPromptTokens = estimateTokens(systemPrompt);
  const toolsTokens = estimateTokens(JSON.stringify(allToolDefinitions));

  const messages: AIMessage[] = [
    {
      content: prompt,
      role: 'user',
    },
  ];

  let fullText = '';
  let turns = 0;

  onEvent({prompt, type: 'agent_start'});

  try {
    while (turns < maxTurns) {
      if (signal != null && signal.aborted) {
        onEvent({type: 'agent_cancelled'});
        return fullText;
      }

      turns++;
      let turnText = '';
      const toolCalls: AIToolCall[] = [];
      let lastMessage: AIMessage | null = null;

      const managed = manageContext(
        messages,
        contextConfig,
        systemPromptTokens,
        toolsTokens,
      );

      const stream = adapter.sendMessage({
        messages: managed.messages,
        signal,
        systemPrompt,
        tools: allToolDefinitions,
      });

      for await (const event of stream) {
        if (signal != null && signal.aborted) {
          break;
        }

        switch (event.type) {
          case 'text_delta':
            turnText += event.delta;
            fullText += event.delta;
            onEvent({delta: event.delta, type: 'text_delta'});
            break;

          case 'tool_call':
            toolCalls.push(event.toolCall);
            onEvent({
              input: event.toolCall.input,
              toolName: event.toolCall.name,
              type: 'tool_call',
            });
            break;

          case 'message_complete':
            lastMessage = event.message;
            break;

          case 'error':
            onEvent({error: event.error, type: 'agent_error'});
            return fullText;
        }
      }

      onEvent({turnNumber: turns, type: 'turn_complete'});

      if (toolCalls.length === 0) {
        onEvent({type: 'stream_end'});
        onEvent({finalText: fullText, type: 'agent_complete'});
        return fullText;
      }

      const toolResults: Array<{toolCallId: string; result: string}> = [];

      for (const toolCall of toolCalls) {
        let result: ToolExecutionResult;

        if (customToolExecutors.has(toolCall.name)) {
          try {
            const rawResult = await customToolExecutors.get(toolCall.name)!(
              toolCall.input,
            );
            result = {
              message: rawResult,
              success: true,
            };
          } catch (err) {
            result = {
              message: `Error: ${err instanceof Error ? err.message : String(err)}`,
              success: false,
            };
          }
        } else {
          result = await toolExecutor.execute(toolCall.name, toolCall.input);
        }

        onEvent({
          result,
          toolName: toolCall.name,
          type: 'tool_result',
        });

        toolResults.push({
          result: serializeToolResult(result),
          toolCallId: toolCall.id,
        });
      }

      const assistantMessage: AIMessage = lastMessage || {
        content: turnText,
        role: 'assistant',
        toolCalls,
      };
      if (!assistantMessage.toolCalls) {
        assistantMessage.toolCalls = toolCalls;
      }

      messages.push(assistantMessage);
      messages.push({
        content: '',
        role: 'user',
        toolResults,
      });

      fullText = '';
    }

    onEvent({type: 'stream_end'});
    onEvent({
      finalText:
        fullText ||
        'Maximum turns reached. The agent completed its available actions.',
      type: 'agent_complete',
    });
    return fullText;
  } catch (err) {
    if (
      err instanceof Error &&
      (err.name === 'AbortError' || err.message === 'AGENT_CANCELLED')
    ) {
      onEvent({type: 'agent_cancelled'});
      return '';
    }
    const error = err instanceof Error ? err : new Error(String(err));
    onEvent({error, type: 'agent_error'});
    throw error;
  }
}

export function createAgentRunner(options: Omit<AgentLoopOptions, 'onEvent'>) {
  let abortController: AbortController | null = null;

  return {
    cancel() {
      if (abortController != null) {
        abortController.abort();
      }
      abortController = null;
    },

    async run(
      prompt: string,
      onEvent: (event: AgentEvent) => void,
    ): Promise<string> {
      abortController = new AbortController();
      try {
        return await runAgentLoop(prompt, {
          ...options,
          onEvent,
          signal: abortController.signal,
        });
      } finally {
        abortController = null;
      }
    },
  };
}
