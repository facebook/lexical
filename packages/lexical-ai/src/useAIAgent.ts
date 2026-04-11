/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {AgentEvent, AgentStatus} from './types';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {COMMAND_PRIORITY_LOW} from 'lexical';
import {useCallback, useEffect, useRef, useState} from 'react';

import {
  AI_CANCEL_COMMAND,
  AI_EXECUTE_COMMAND,
  AI_STATUS_COMMAND,
} from './commands';

export interface UseAIAgentReturn {
  /** Cancel the currently running agent task */
  cancel: () => void;
  /** All agent events from the current/last execution */
  events: AgentEvent[];
  /** Start an AI agent task with the given prompt */
  execute: (prompt: string) => void;
  /** Current agent status */
  status: AgentStatus;
  /** Accumulated streamed text from the AI */
  streamedText: string;
}

/**
 * React hook for interacting with the AI agent from any component
 * within a LexicalComposer tree.
 *
 * Requires `<LexicalAINativePlugin />` to be mounted as a sibling plugin.
 *
 * Usage:
 * ```tsx
 * function AIChatPanel() {
 *   const { execute, cancel, status, streamedText, events } = useAIAgent();
 *
 *   return (
 *     <div>
 *       <input onSubmit={(e) => execute(e.target.value)} />
 *       <div>{streamedText}</div>
 *       {status === 'running' && <button onClick={cancel}>Cancel</button>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useAIAgent(): UseAIAgentReturn {
  const [editor] = useLexicalComposerContext();
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [streamedText, setStreamedText] = useState('');
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const streamedTextRef = useRef('');

  // Listen for status command updates from the plugin
  useEffect(() => {
    return editor.registerCommand(
      AI_STATUS_COMMAND,
      (payload) => {
        setStatus(payload.status);
        if (payload.status === 'idle' || payload.status === 'cancelled') {
          // Reset streaming state for next run
          streamedTextRef.current = '';
        }
        return false; // Don't stop propagation — other listeners may want this
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor]);

  const execute = useCallback(
    (prompt: string) => {
      // Reset state for new execution
      setStreamedText('');
      setEvents([]);
      streamedTextRef.current = '';

      // The onAgentEvent on the plugin needs to forward to this hook.
      // We do this by dispatching the command, which the plugin handles.
      // The plugin's onAgentEvent prop should be wired to update this hook's state.
      editor.dispatchCommand(AI_EXECUTE_COMMAND, {prompt});
    },
    [editor],
  );

  const cancel = useCallback(() => {
    editor.dispatchCommand(AI_CANCEL_COMMAND, undefined);
  }, [editor]);

  return {cancel, events, execute, status, streamedText};
}

/**
 * Create an onAgentEvent handler that updates useAIAgent's state.
 * Pass this as the `onAgentEvent` prop to `<LexicalAINativePlugin />`.
 *
 * Usage:
 * ```tsx
 * function EditorWithAI() {
 *   const [agentState, onAgentEvent] = useAIAgentState();
 *
 *   return (
 *     <LexicalComposer initialConfig={config}>
 *       <LexicalAINativePlugin adapter={adapter} onAgentEvent={onAgentEvent} />
 *       <AIChatPanel agentState={agentState} />
 *     </LexicalComposer>
 *   );
 * }
 * ```
 */
export function useAIAgentState(): [
  {events: AgentEvent[]; streamedText: string},
  (event: AgentEvent) => void,
] {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [streamedText, setStreamedText] = useState('');
  const streamedTextRef = useRef('');

  const onAgentEvent = useCallback((event: AgentEvent) => {
    setEvents((prev) => [...prev, event]);

    switch (event.type) {
      case 'agent_start':
        setStreamedText('');
        streamedTextRef.current = '';
        break;
      case 'text_delta':
        streamedTextRef.current += event.delta;
        setStreamedText(streamedTextRef.current);
        break;
      case 'stream_end':
        break;
      case 'agent_complete':
        setStreamedText(event.finalText);
        break;
    }
  }, []);

  return [{events, streamedText}, onAgentEvent];
}
