/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {HistoryExtension} from '@lexical/history';
import {PlainTextExtension} from '@lexical/plain-text';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalExtensionComposer} from '@lexical/react/LexicalExtensionComposer';
import {$getRoot, defineExtension} from 'lexical';
import {useCallback, useRef, useState} from 'react';

import {EmojiPlugin} from './plugins/EmojiPlugin';
import {clearEditor, SubmitOnEnterPlugin} from './plugins/SubmitOnEnterPlugin';

const chatInputExtension = defineExtension({
  dependencies: [PlainTextExtension, HistoryExtension],
  name: '@lexical/website/chat-input-editor',
  namespace: '@lexical/website/chat-input-editor',
  theme: {paragraph: 'm-0'},
});

interface Message {
  author: string;
  id: number;
  text: string;
}

const INITIAL_MESSAGES: Message[] = [
  {author: 'buddy', id: 1, text: 'Are you coming to the bar tonight?'},
  {author: 'buddy', id: 2, text: 'Tony is coming too! 🍺'},
];

interface SendButtonProps {
  onSubmit: (content: string) => void;
}

function SendButton({onSubmit}: SendButtonProps) {
  const [editor] = useLexicalComposerContext();

  const handleClick = useCallback(() => {
    const content = editor
      .getEditorState()
      .read(() => $getRoot().getTextContent().trim());
    if (content) {
      onSubmit(content);
      clearEditor(editor);
    }
  }, [editor, onSubmit]);

  return (
    <button
      type="button"
      className="flex h-[34px] w-[34px] shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-indigo-500 text-white transition-[background-color,transform] duration-150 hover:bg-indigo-600 active:scale-[0.92] dark:bg-indigo-600 dark:hover:bg-indigo-700"
      title="Send message (Enter)"
      onClick={handleClick}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="currentColor">
        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
      </svg>
    </button>
  );
}

export default function ChatInputEditor() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const onSubmit = useCallback((content: string) => {
    setMessages((prev) => [
      ...prev,
      {author: 'me', id: Date.now(), text: content},
    ]);
  }, []);

  return (
    <div className="flex h-[400px] flex-col overflow-hidden rounded-xl border border-solid border-zinc-200 bg-[#f9f9fb] dark:border-white/10 dark:bg-[#1a1a1c] max-[996px]:h-[340px]">
      <div className="flex shrink-0 items-center gap-2.5 border-b border-zinc-200 bg-white px-3.5 py-2.5 [border-bottom-style:solid] dark:border-white/[0.08] dark:bg-[#232325]">
        <div className="flex h-[34px] w-[34px] shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-[0.8rem] font-bold text-white">
          Y
        </div>
        <div className="flex flex-col gap-px">
          <span className="text-sm font-semibold leading-tight dark:text-zinc-200">
            Your buddy
          </span>
          <span className="text-[0.72rem] leading-tight text-green-500">
            ● Online
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-3.5 pb-1.5 pt-3.5">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex max-w-[78%] items-end gap-1.5 ${msg.author === 'me' ? 'flex-row-reverse self-end' : 'self-start'}`}>
            {msg.author === 'buddy' && (
              <div className="mb-0.5 flex h-6 w-6 shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-[0.65rem] font-bold text-white">
                Y
              </div>
            )}
            <div
              className={`whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm leading-[1.45] ${msg.author === 'buddy' ? 'rounded-bl-[4px] bg-white text-[#18181b] shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:bg-[#2e2e32] dark:text-zinc-200 dark:shadow-none' : 'rounded-br-[4px] bg-indigo-500 text-white dark:bg-indigo-600'}`}>
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <LexicalExtensionComposer
        extension={chatInputExtension}
        contentEditable={null}>
        <div className="flex shrink-0 items-end gap-2 border-t border-zinc-200 bg-white px-3 py-2.5 [border-top-style:solid] dark:border-white/[0.08] dark:bg-[#232325]">
          <EmojiPlugin />
          <ContentEditable
            className="max-h-[120px] min-h-[36px] flex-1 overflow-y-auto rounded-[20px] border border-solid border-transparent bg-zinc-100 px-2.5 py-1.5 text-sm leading-relaxed outline-none transition-[border-color] duration-150 focus:border-indigo-300 focus:bg-white dark:bg-[#3a3a3c] dark:text-zinc-200 dark:focus:border-indigo-500 dark:focus:bg-[#2e2e32]"
            aria-label="Message input"
            aria-placeholder="Type a message…"
            placeholder={<></>}
          />
          <SubmitOnEnterPlugin onSubmit={onSubmit} />
          <SendButton onSubmit={onSubmit} />
        </div>
      </LexicalExtensionComposer>
    </div>
  );
}
