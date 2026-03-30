/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  EditorState,
  LexicalEditor,
} from 'lexical';
import {useCallback, useEffect, useRef, useState} from 'react';

import {ChatInput} from './ChatInput';
import {ChatMessage} from './ChatMessage';

interface Message {
  author: string;
  id: number;
  initialState: EditorState | ((editor: LexicalEditor) => void);
}

function makeTextState(text: string): (editor: LexicalEditor) => void {
  return (editor: LexicalEditor) => {
    editor.update(() => {
      const paragraph = $createParagraphNode();
      paragraph.append($createTextNode(text));
      $getRoot().append(paragraph);
    });
  };
}

const INITIAL_MESSAGES: Message[] = [
  {
    author: 'buddy',
    id: 1,
    initialState: makeTextState('Are you coming to the bar tonight?'),
  },
  {
    author: 'buddy',
    id: 2,
    initialState: makeTextState('Tony is coming too! 🍺'),
  },
];

export default function Editor() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const onSubmit = useCallback((editorState: EditorState) => {
    setMessages((prev) => [
      ...prev,
      {author: 'me', id: Date.now(), initialState: editorState},
    ]);
  }, []);

  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-solid border-zinc-200 bg-[#f9f9fb] dark:border-white/10 dark:bg-[#1a1a1c]">
      <div className="flex shrink-0 items-center gap-2.5 border-b [border-bottom-style:solid] border-zinc-200 bg-white px-3.5 py-2.5 dark:border-white/[0.08] dark:bg-[#232325]">
        <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-[0.8rem] font-bold text-white select-none">
          Y
        </div>
        <div className="flex flex-col gap-px">
          <span className="text-sm leading-tight font-semibold dark:text-zinc-200">
            Your buddy
          </span>
          <span className="text-[0.72rem] leading-tight text-green-500">
            ● Online
          </span>
        </div>
      </div>

      <div
        ref={messagesContainerRef}
        className="flex h-[288px] flex-col gap-1.5 overflow-y-auto px-3.5 pt-3.5 pb-1.5 max-[996px]:h-[228px]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex max-w-[78%] items-end gap-1.5 ${msg.author === 'me' ? 'flex-row-reverse self-end' : 'self-start'}`}>
            {msg.author === 'buddy' && (
              <div className="mb-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-[0.65rem] font-bold text-white select-none">
                Y
              </div>
            )}
            <div
              className={`rounded-2xl px-3 py-2 break-words ${msg.author === 'buddy' ? 'rounded-bl-[4px] bg-white text-[#18181b] shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:bg-[#2e2e32] dark:text-zinc-200 dark:shadow-none' : 'rounded-br-[4px] bg-indigo-500 text-white dark:bg-indigo-600'}`}>
              <ChatMessage initialState={msg.initialState} />
            </div>
          </div>
        ))}
      </div>

      <ChatInput onSubmit={onSubmit} />
    </div>
  );
}
