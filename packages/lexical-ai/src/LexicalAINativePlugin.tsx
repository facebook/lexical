/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {AgentEvent, LexicalAINativePluginProps} from './types';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {mergeRegister} from '@lexical/utils';
import {COMMAND_PRIORITY_LOW} from 'lexical';
import {useCallback, useEffect, useRef} from 'react';

import {createAgentRunner} from './agent/AgentLoop';
import {
  AI_CANCEL_COMMAND,
  AI_EXECUTE_COMMAND,
  AI_STATUS_COMMAND,
} from './commands';

/**
 * LexicalAINativePlugin — turns a Lexical editor into an AI-native editor.
 *
 * This plugin:
 * 1. Exposes editor operations as tools for LLM consumption
 * 2. Runs an AI agent loop (ReAct) that can read, reason, and edit the document
 * 3. Accepts any AI provider via the AIAdapter interface
 *
 * Usage:
 * ```tsx
 * <LexicalComposer initialConfig={config}>
 *   <RichTextPlugin ... />
 *   <LexicalAINativePlugin
 *     adapter={myClaudeAdapter}
 *     onAgentEvent={(event) => console.log(event)}
 *   />
 * </LexicalComposer>
 * ```
 */
export function LexicalAINativePlugin({
  adapter,
  systemPrompt,
  maxTurns = 15,
  customTools,
  contextConfig,
  onAgentEvent,
}: LexicalAINativePluginProps): null {
  const [editor] = useLexicalComposerContext();
  const runnerRef = useRef<ReturnType<typeof createAgentRunner> | null>(null);
  const onAgentEventRef = useRef(onAgentEvent);

  // Keep the callback ref fresh without causing effect re-runs
  useEffect(() => {
    onAgentEventRef.current = onAgentEvent;
  }, [onAgentEvent]);

  const handleEvent = useCallback((event: AgentEvent) => {
    if (onAgentEventRef.current) {
      onAgentEventRef.current(event);
    }
  }, []);

  useEffect(() => {
    // Create the agent runner bound to this editor
    const runner = createAgentRunner({
      adapter,
      contextConfig,
      customTools,
      editor,
      maxTurns,
      systemPrompt,
    });
    runnerRef.current = runner;

    const cleanup = mergeRegister(
      // Handle AI_EXECUTE_COMMAND
      editor.registerCommand(
        AI_EXECUTE_COMMAND,
        (payload) => {
          const {prompt} = payload;

          // Dispatch status update
          editor.dispatchCommand(AI_STATUS_COMMAND, {status: 'running'});

          runner
            .run(prompt, handleEvent)
            .then(() => {
              editor.dispatchCommand(AI_STATUS_COMMAND, {status: 'idle'});
            })
            .catch((err) => {
              console.error('[LexicalAI] Agent error:', err);
              handleEvent({
                error: err instanceof Error ? err : new Error(String(err)),
                type: 'agent_error',
              });
              editor.dispatchCommand(AI_STATUS_COMMAND, {status: 'error'});
            });

          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),

      // Handle AI_CANCEL_COMMAND
      editor.registerCommand(
        AI_CANCEL_COMMAND,
        () => {
          runner.cancel();
          editor.dispatchCommand(AI_STATUS_COMMAND, {status: 'cancelled'});
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );

    return () => {
      runner.cancel();
      cleanup();
      runnerRef.current = null;
    };
  }, [
    adapter,
    editor,
    systemPrompt,
    maxTurns,
    customTools,
    contextConfig,
    handleEvent,
  ]);

  return null;
}
