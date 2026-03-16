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
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  defineExtension,
  KEY_ENTER_COMMAND,
} from 'lexical';
import {useCallback, useEffect, useRef, useState} from 'react';

const chatInputExtension = defineExtension({
  dependencies: [PlainTextExtension, HistoryExtension],
  name: '@lexical/website/chat-input-editor',
  namespace: '@lexical/website/chat-input-editor',
  theme: {paragraph: 'm-0'},
});

const INITIAL_MESSAGES = [
  {author: 'buddy', id: 1, text: 'Are you coming to the bar tonight?'},
  {author: 'buddy', id: 2, text: 'Tony is coming too! 🍺'},
];

const EMOJI_CATEGORIES = {
  food: [
    '🍕',
    '🍔',
    '🍟',
    '🌮',
    '🍣',
    '🍜',
    '🍺',
    '🍻',
    '🥂',
    '🍹',
    '☕',
    '🧋',
    '🍰',
    '🍩',
    '🍪',
    '🍫',
    '🍓',
    '🍉',
    '🥑',
    '🌶️',
  ],
  fun: [
    '🎉',
    '🎊',
    '🎈',
    '🎁',
    '🏆',
    '🎯',
    '🎮',
    '🎬',
    '🎵',
    '🎶',
    '🔥',
    '💥',
    '⭐',
    '🌟',
    '✨',
    '💫',
    '🎂',
    '🎀',
    '🪄',
    '🎭',
  ],
  gestures: [
    '👋',
    '✌️',
    '👍',
    '👎',
    '👏',
    '🙌',
    '🤝',
    '🫶',
    '🙏',
    '🤞',
    '💪',
    '🤙',
    '👌',
    '🤌',
    '☝️',
    '🫵',
    '🖐️',
    '✋',
    '🤜',
    '🤛',
  ],
  hearts: [
    '❤️',
    '🧡',
    '💛',
    '💚',
    '💙',
    '💜',
    '🖤',
    '🤍',
    '🤎',
    '💔',
    '💖',
    '💗',
    '💓',
    '💞',
    '💕',
    '💝',
    '♥️',
    '❤️‍🔥',
    '💟',
    '🫀',
  ],
  smileys: [
    '😀',
    '😂',
    '🥹',
    '😊',
    '😇',
    '🥰',
    '😍',
    '😘',
    '😋',
    '😜',
    '🤪',
    '🥳',
    '😎',
    '🤔',
    '😴',
    '😷',
    '🤯',
    '😱',
    '🤬',
    '😭',
  ],
};

const CATEGORY_ICONS = {
  food: '🍕',
  fun: '🎉',
  gestures: '👋',
  hearts: '❤️',
  smileys: '😊',
};

function clearEditor(editor) {
  editor.update(() => {
    const root = $getRoot();
    root.clear();
    const paragraph = $createParagraphNode();
    paragraph.append($createTextNode(''));
    root.append(paragraph);
    if ($isParagraphNode(paragraph)) {
      paragraph.selectEnd();
    }
  });
}

function SubmitOnEnterPlugin({onSubmit}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        if (event !== null && event.shiftKey) {
          return false;
        }
        if (event !== null) {
          event.preventDefault();
        }
        const content = editor
          .getEditorState()
          .read(() => $getRoot().getTextContent().trim());
        if (content) {
          onSubmit(content);
          clearEditor(editor);
        }
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor, onSubmit]);

  return null;
}

function EmojiPlugin() {
  const [editor] = useLexicalComposerContext();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('smileys');
  const panelRef = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (e) => {
      if (
        !(panelRef.current !== null && panelRef.current.contains(e.target)) &&
        !(btnRef.current !== null && btnRef.current.contains(e.target))
      ) {
        setOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const insertEmoji = useCallback(
    (emoji) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertNodes([$createTextNode(emoji)]);
        } else {
          // fallback: append to end
          const root = $getRoot();
          const lastChild = root.getLastChild();
          if (lastChild) {
            lastChild.selectEnd();
            const sel = $getSelection();
            if (sel !== null) {
              sel.insertNodes([$createTextNode(emoji)]);
            }
          }
        }
      });
    },
    [editor],
  );

  return (
    <div className="relative shrink-0">
      <button
        ref={btnRef}
        type="button"
        className={`flex h-[34px] w-[34px] shrink-0 cursor-pointer items-center justify-center rounded-full border-0 text-[1.1rem] leading-none transition-[background-color,transform] duration-150 active:scale-[0.92] ${open ? 'bg-indigo-100 dark:bg-indigo-900' : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-[#3a3a3c] dark:hover:bg-zinc-600'}`}
        title="Add emoji"
        onClick={() => setOpen((v) => !v)}>
        😊
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute bottom-[calc(100%+8px)] left-0 z-50 w-[272px] overflow-hidden rounded-xl border border-solid border-zinc-200 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.12)] dark:border-zinc-700 dark:bg-[#232325] dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
          <div
            className="flex gap-0.5 border-b border-zinc-100 px-1 pb-0 pt-1 [border-bottom-style:solid] dark:border-white/[0.07]"
            role="tablist">
            {Object.keys(EMOJI_CATEGORIES).map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={activeTab === cat}
                className={`flex-1 cursor-pointer rounded-t-md border-0 bg-transparent px-1 py-1.5 text-base leading-none transition-[opacity,background-color] duration-100 ${activeTab === cat ? 'bg-zinc-100 opacity-100 dark:bg-[#3a3a3c]' : 'opacity-50 hover:bg-zinc-100 hover:opacity-80 dark:hover:bg-[#3a3a3c]'}`}
                title={cat.charAt(0).toUpperCase() + cat.slice(1)}
                onClick={() => setActiveTab(cat)}>
                {CATEGORY_ICONS[cat]}
              </button>
            ))}
          </div>
          <div
            className="grid max-h-[168px] grid-cols-8 gap-0.5 overflow-y-auto p-1.5"
            role="listbox">
            {EMOJI_CATEGORIES[activeTab].map((emoji) => (
              <button
                key={emoji}
                type="button"
                role="option"
                aria-selected={false}
                className="flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-[1.1rem] leading-none transition-[background-color,transform] duration-100 hover:scale-[1.2] hover:bg-zinc-100 dark:hover:bg-[#3a3a3c]"
                onClick={() => insertEmoji(emoji)}>
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SendButton({onSubmit}) {
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
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const messagesEndRef = useRef(null);

  const onSubmit = useCallback((content) => {
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
            aria-label="Message input"
            aria-placeholder="Type a message…"
            className="max-h-[120px] min-h-[36px] flex-1 overflow-y-auto rounded-[20px] border border-solid border-transparent bg-zinc-100 px-2.5 py-1.5 text-sm leading-relaxed outline-none transition-[border-color] duration-150 focus:border-indigo-300 focus:bg-white dark:bg-[#3a3a3c] dark:text-zinc-200 dark:focus:border-indigo-500 dark:focus:bg-[#2e2e32]"
          />
          <SubmitOnEnterPlugin onSubmit={onSubmit} />
          <SendButton onSubmit={onSubmit} />
        </div>
      </LexicalExtensionComposer>
    </div>
  );
}
