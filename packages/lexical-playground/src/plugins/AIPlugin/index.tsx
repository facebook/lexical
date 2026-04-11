/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {AgentEvent} from '@lexical/ai';
import type {JSX} from 'react';

import './index.css';

import {
  AI_EXECUTE_COMMAND,
  LexicalAINativePlugin,
  useAIAgentState,
} from '@lexical/ai';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useCallback, useRef, useState} from 'react';

import {AnthropicAdapter} from './AnthropicAdapter';

const adapter = new AnthropicAdapter();

interface ChatMessage {
  content: string;
  id: string;
  role: 'user' | 'assistant' | 'tool';
  toolName?: string;
}

export default function AIPlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [{streamedText}, onAgentEvent] = useAIAgentState();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAgentEvent = useCallback(
    (event: AgentEvent) => {
      onAgentEvent(event);

      switch (event.type) {
        case 'agent_start':
          setIsRunning(true);
          break;

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
          setIsRunning(false);
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
          setIsRunning(false);
          break;

        case 'agent_cancelled':
          setIsRunning(false);
          break;
      }

      // Scroll to bottom
      setTimeout(() => {
        if (messagesEndRef.current != null) {
          messagesEndRef.current.scrollIntoView({behavior: 'smooth'});
        }
      }, 50);
    },
    [onAgentEvent],
  );

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

    editor.dispatchCommand(AI_EXECUTE_COMMAND, {prompt});
  }, [editor, input, isRunning]);

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
    <>
      <LexicalAINativePlugin
        adapter={adapter}
        onAgentEvent={handleAgentEvent}
      />
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
                <li>Replace "hello" with "world"</li>
                <li>Insert "New section" after "existing text"</li>
                <li>Delete "unwanted text"</li>
                <li>Bold "important text"</li>
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
    </>
  );
}
