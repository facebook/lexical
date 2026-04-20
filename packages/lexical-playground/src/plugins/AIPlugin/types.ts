/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// ─── AI Adapter Interface ───

export interface AIToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface AIToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: AIToolCall[];
  toolResults?: Array<{toolCallId: string; result: string}>;
}

export type AIStreamEvent =
  | {type: 'text_delta'; delta: string}
  | {type: 'tool_call'; toolCall: AIToolCall}
  | {type: 'message_complete'; message: AIMessage}
  | {type: 'error'; error: Error};

export interface AIAdapter {
  sendMessage(params: {
    systemPrompt: string;
    messages: AIMessage[];
    tools: AIToolDefinition[];
    signal?: AbortSignal;
  }): AsyncIterable<AIStreamEvent>;
}

// ─── Tool Execution ───

export interface ToolExecutionResult {
  success: boolean;
  message: string;
  data?: unknown;
}

// ─── Agent Events (for UI consumption) ───

export type AgentEvent =
  | {type: 'agent_start'; prompt: string}
  | {type: 'text_delta'; delta: string}
  | {type: 'stream_end'}
  | {type: 'tool_call'; toolName: string; input: Record<string, unknown>}
  | {
      type: 'tool_result';
      toolName: string;
      result: ToolExecutionResult;
    }
  | {type: 'turn_complete'; turnNumber: number}
  | {type: 'agent_complete'; finalText: string}
  | {type: 'agent_error'; error: Error}
  | {type: 'agent_cancelled'};

export type AgentStatus = 'idle' | 'running' | 'error' | 'cancelled';

// ─── Tool Registration ───

export interface CustomToolRegistration {
  definition: AIToolDefinition;
  executor: (input: Record<string, unknown>) => string | Promise<string>;
}
