/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  AgentEvent,
  AgentStatus,
  AIAdapter,
  CustomToolRegistration,
} from './types';

import {signal} from '@lexical/extension';
import {
  COMMAND_PRIORITY_LOW,
  createCommand,
  defineExtension,
  type LexicalCommand,
  type LexicalEditor,
  mergeRegister,
  shallowMergeConfig,
} from 'lexical';

import {createAgentRunner} from './agent/AgentLoop';

export const AI_EXECUTE_COMMAND: LexicalCommand<{
  prompt: string;
}> = createCommand('AI_EXECUTE_COMMAND');

export const AI_CANCEL_COMMAND: LexicalCommand<void> =
  createCommand('AI_CANCEL_COMMAND');

export interface AIExtensionConfig {
  adapter: AIAdapter | null;
  systemPrompt?: string;
  maxTurns: number;
  tools: CustomToolRegistration[];
}

function createAIState(editor: LexicalEditor, config: AIExtensionConfig) {
  const status = signal<AgentStatus>('idle');
  const streamedText = signal('');
  const lastEvent = signal<AgentEvent | null>(null);

  const runner =
    config.adapter != null
      ? createAgentRunner({
          adapter: config.adapter,
          customTools: config.tools,
          editor,
          maxTurns: config.maxTurns,
          systemPrompt: config.systemPrompt,
        })
      : null;

  function execute(prompt: string, onEvent?: (event: AgentEvent) => void) {
    if (runner == null) {
      console.error('[AIExtension] No adapter configured');
      return;
    }

    status.value = 'running';
    streamedText.value = '';

    runner
      .run(prompt, (event: AgentEvent) => {
        lastEvent.value = event;
        if (event.type === 'text_delta') {
          streamedText.value += event.delta;
        }
        if (onEvent) {
          onEvent(event);
        }
      })
      .then(() => {
        status.value = 'idle';
      })
      .catch((err) => {
        console.error('[AIExtension] Agent error:', err);
        status.value = 'error';
      });
  }

  function cancel() {
    if (runner != null) {
      runner.cancel();
    }
    status.value = 'cancelled';
  }

  function dispose() {
    if (runner != null) {
      runner.cancel();
    }
  }

  return {cancel, dispose, execute, lastEvent, status, streamedText};
}

export type AIExtensionOutput = ReturnType<typeof createAIState>;

export const AIExtension = defineExtension({
  build: createAIState,
  config: {
    adapter: null,
    maxTurns: 15,
    tools: [],
  } as AIExtensionConfig,
  mergeConfig(a, b) {
    const config = shallowMergeConfig(a, b);
    if (b.tools) {
      config.tools = b.tools.length > 0 ? [...a.tools, ...b.tools] : a.tools;
    }
    return config;
  },
  name: '@lexical/playground/ai',
  register(editor, _config, state) {
    const output = state.getOutput();
    return mergeRegister(
      () => output.dispose(),
      editor.registerCommand(
        AI_EXECUTE_COMMAND,
        (payload) => {
          output.execute(payload.prompt);
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        AI_CANCEL_COMMAND,
        () => {
          output.cancel();
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  },
});
