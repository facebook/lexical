/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$createTextNode, $insertNodes} from 'lexical';
import {useCallback, useEffect, useRef, useState} from 'react';

const EMOJI_CATEGORIES: Record<string, string[]> = {
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

const CATEGORY_ICONS: Record<string, string> = {
  food: '🍕',
  fun: '🎉',
  gestures: '👋',
  hearts: '❤️',
  smileys: '😊',
};

export function EmojiPlugin() {
  const [editor] = useLexicalComposerContext();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('smileys');
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (e: PointerEvent) => {
      if (
        !(
          panelRef.current !== null &&
          panelRef.current.contains(e.target as Node)
        ) &&
        !(btnRef.current !== null && btnRef.current.contains(e.target as Node))
      ) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
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
    (emoji: string) => {
      editor.update(() => {
        $insertNodes([$createTextNode(emoji)]);
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
            className="flex gap-0.5 border-b [border-bottom-style:solid] border-zinc-100 px-1 pt-1 pb-0 dark:border-white/[0.07]"
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
