/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// Plugin
export {LexicalAINativePlugin} from './LexicalAINativePlugin';

// Hook
export type {UseAIAgentReturn} from './useAIAgent';
export {useAIAgent, useAIAgentState} from './useAIAgent';

// Commands
export {
  AI_CANCEL_COMMAND,
  AI_EXECUTE_COMMAND,
  AI_STATUS_COMMAND,
} from './commands';

// Types
export type {
  AgentEvent,
  AgentStatus,
  AIAdapter,
  AIMessage,
  AIStreamEvent,
  AIToolCall,
  AIToolDefinition,
  CustomToolRegistration,
  LexicalAINativePluginProps,
  ToolExecutionResult,
} from './types';

// Tools (for advanced usage — building custom executors or extending tools)
export {BUILT_IN_TOOL_DEFINITIONS} from './tools/definitions';
export type {ToolExecutor} from './tools/executor';
export {createToolExecutor} from './tools/executor';
export {
  $findNodeContaining,
  $getSelectedText,
  $serializeDocumentForAI,
} from './tools/helpers';

// Agent (for advanced usage — running agent loop directly)
export type {AgentLoopOptions} from './agent/AgentLoop';
export {createAgentRunner, runAgentLoop} from './agent/AgentLoop';

// Context management
export type {
  ContextManagerConfig,
  ManagedContext,
} from './agent/ContextManager';
export {
  DEFAULT_CONTEXT_CONFIG,
  estimateMessagesTokens,
  estimateMessageTokens,
  estimateTokens,
  manageContext,
} from './agent/ContextManager';
