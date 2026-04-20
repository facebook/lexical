/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {AgentEvent} from './types';
import type {ReadonlySignal} from '@lexical/extension';
import type {JSX} from 'react';

import './index.css';

import {useOptionalExtensionDependency} from '@lexical/react/useExtensionComponent';
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

import {AIExtension} from './AIExtension';

function useSignalValue<V>(s: ReadonlySignal<V>): V {
  const [subscribe, getSnapshot] = useMemo(
    () => [s.subscribe.bind(s), s.peek.bind(s)] as const,
    [s],
  );
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

interface ChatMessage {
  content: string;
  id: string;
  role: 'user' | 'assistant' | 'tool';
  toolName?: string;
}

export default function AIPlugin(): JSX.Element | null {
  const dep = useOptionalExtensionDependency(AIExtension);

  if (!dep) {
    return null;
  }

  return <AIPluginInner output={dep.output} />;
}

function AIPluginInner({
  output,
}: {
  output: NonNullable<
    ReturnType<typeof useOptionalExtensionDependency<typeof AIExtension>>
  >['output'];
}): JSX.Element {
  const status = useSignalValue(output.status);
  const streamedText = useSignalValue(output.streamedText);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isRunning = status === 'running';

  const handleAgentEvent = useCallback((event: AgentEvent) => {
    switch (event.type) {
      case 'tool_call':
        setMessages((prev) => [
          ...prev,
          {
            content: `${event.toolName}(${JSON.stringify(event.input)})`,
            id: `tool-${Date.now()}`,
            role: 'tool',
            toolName: event.toolName,
          },
        ]);
        break;

      case 'tool_result':
        setMessages((prev) => [
          ...prev,
          {
            content: event.result.message,
            id: `result-${Date.now()}`,
            role: 'tool',
            toolName: event.toolName,
          },
        ]);
        break;

      case 'agent_complete':
        setMessages((prev) => [
          ...prev,
          {
            content: event.finalText,
            id: `ai-${Date.now()}`,
            role: 'assistant',
          },
        ]);
        break;

      case 'agent_error':
        setMessages((prev) => [
          ...prev,
          {
            content: `Error: ${event.error.message}`,
            id: `err-${Date.now()}`,
            role: 'assistant',
          },
        ]);
        break;
    }

    setTimeout(() => {
      if (messagesEndRef.current != null) {
        messagesEndRef.current.scrollIntoView({behavior: 'smooth'});
      }
    }, 50);
  }, []);

  const handleSubmit = useCallback(() => {
    const prompt = input.trim();
    if (!prompt || isRunning) {
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        content: prompt,
        id: `user-${Date.now()}`,
        role: 'user',
      },
    ]);
    setInput('');

    output.execute(prompt, handleAgentEvent);
  }, [output, input, isRunning, handleAgentEvent]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <div className="ai-plugin-panel">
      <div className="ai-plugin-header">
        <span className="ai-plugin-title">AI Assistant</span>
        <span className="ai-plugin-badge">AI</span>
      </div>
      <div className="ai-plugin-messages">
        {messages.length === 0 && (
          <div className="ai-plugin-empty">
            Ask the AI to edit your document. Try:
            <ul>
              <li>Replace &quot;hello&quot; with &quot;world&quot;</li>
              <li>
                Insert &quot;New section&quot; after &quot;existing text&quot;
              </li>
              <li>Delete &quot;unwanted text&quot;</li>
              <li>Bold &quot;important text&quot;</li>
              <li>Get document</li>
            </ul>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`ai-plugin-message ai-plugin-message-${msg.role}`}>
            {msg.role === 'tool' && (
              <span className="ai-plugin-tool-badge">{msg.toolName}</span>
            )}
            <span className="ai-plugin-message-content">{msg.content}</span>
          </div>
        ))}
        {isRunning && streamedText && (
          <div className="ai-plugin-message ai-plugin-message-assistant ai-plugin-streaming">
            <span className="ai-plugin-message-content">{streamedText}</span>
            <span className="ai-plugin-cursor" />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="ai-plugin-input-area">
        <input
          ref={inputRef}
          className="ai-plugin-input"
          disabled={isRunning}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isRunning ? 'AI is working...' : 'Ask AI to edit your document...'
          }
          type="text"
          value={input}
        />
        <button
          className="ai-plugin-send"
          disabled={isRunning || !input.trim()}
          onClick={handleSubmit}>
          {isRunning ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
