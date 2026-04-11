/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {AgentStatus} from './types';
import type {LexicalCommand} from 'lexical';

import {createCommand} from 'lexical';

/**
 * Dispatch this command to start an AI agent task.
 * The agent will read the document, call tools, and execute edits.
 */
export const AI_EXECUTE_COMMAND: LexicalCommand<{
  prompt: string;
  context?: Record<string, unknown>;
}> = createCommand('AI_EXECUTE_COMMAND');

/**
 * Dispatch this command to cancel a running AI agent task.
 */
export const AI_CANCEL_COMMAND: LexicalCommand<void> =
  createCommand('AI_CANCEL_COMMAND');

/**
 * Dispatched by the plugin to notify listeners of agent status changes.
 * Register a command listener to observe status updates.
 */
export const AI_STATUS_COMMAND: LexicalCommand<{
  status: AgentStatus;
}> = createCommand('AI_STATUS_COMMAND');
