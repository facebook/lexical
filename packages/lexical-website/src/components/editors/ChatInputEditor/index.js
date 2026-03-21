/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import './styles.css';

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
  theme: {paragraph: 'chat-paragraph'},
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
    <div className="chat-emoji-wrap">
      <button
        ref={btnRef}
        type="button"
        className={`chat-emoji-btn${open ? ' active' : ''}`}
        title="Add emoji"
        onClick={() => setOpen((v) => !v)}>
        😊
      </button>

      {open && (
        <div ref={panelRef} className="chat-emoji-panel">
          <div className="chat-emoji-tabs" role="tablist">
            {Object.keys(EMOJI_CATEGORIES).map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={activeTab === cat}
                className={`chat-emoji-tab${activeTab === cat ? ' active' : ''}`}
                title={cat.charAt(0).toUpperCase() + cat.slice(1)}
                onClick={() => setActiveTab(cat)}>
                {CATEGORY_ICONS[cat]}
              </button>
            ))}
          </div>
          <div className="chat-emoji-grid" role="listbox">
            {EMOJI_CATEGORIES[activeTab].map((emoji) => (
              <button
                key={emoji}
                type="button"
                role="option"
                aria-selected={false}
                className="chat-emoji-item"
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
      className="chat-send-btn"
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
    <div className="chat-shell">
      <div className="chat-header">
        <div className="chat-avatar">Y</div>
        <div className="chat-header-info">
          <span className="chat-header-name">Your buddy</span>
          <span className="chat-header-status">● Online</span>
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-row ${msg.author === 'me' ? 'chat-row--me' : 'chat-row--buddy'}`}>
            {msg.author === 'buddy' && (
              <div className="chat-bubble-avatar">Y</div>
            )}
            <div className="chat-bubble">{msg.text}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <LexicalExtensionComposer
        extension={chatInputExtension}
        contentEditable={null}>
        <div className="chat-input-shell">
          <EmojiPlugin />
          <ContentEditable className="chat-input" />
          <SubmitOnEnterPlugin onSubmit={onSubmit} />
          <SendButton onSubmit={onSubmit} />
        </div>
      </LexicalExtensionComposer>
    </div>
  );
}
