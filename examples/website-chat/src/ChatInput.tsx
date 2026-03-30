/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {ClearEditorExtension} from '@lexical/extension';
import {HistoryExtension} from '@lexical/history';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalExtensionComposer} from '@lexical/react/LexicalExtensionComposer';
import {RichTextExtension} from '@lexical/rich-text';
import {defineExtension, EditorState} from 'lexical';

import {EmojiPlugin} from './plugins/EmojiPlugin';
import {SendButtonPlugin} from './plugins/SendButtonPlugin';
import {SubmitOnEnterPlugin} from './plugins/SubmitOnEnterPlugin';

const chatInputExtension = defineExtension({
  dependencies: [RichTextExtension, HistoryExtension, ClearEditorExtension],
  name: '@lexical/website/chat-input-editor',
  namespace: '@lexical/website/chat-input-editor',
  theme: {
    paragraph: 'm-0',
    text: {
      bold: 'font-bold',
      italic: 'italic',
      underline: 'underline',
    },
  },
});

interface ChatInputProps {
  onSubmit: (editorState: EditorState) => void;
}

export function ChatInput({onSubmit}: ChatInputProps) {
  return (
    <LexicalExtensionComposer
      extension={chatInputExtension}
      contentEditable={null}>
      <div className="flex w-full items-end gap-2 border-t [border-top-style:solid] border-zinc-200 bg-white px-3 py-2.5 dark:border-white/[0.08] dark:bg-[#232325]">
        <EmojiPlugin />
        <ContentEditable
          className="max-h-[120px] min-h-[36px] flex-1 overflow-y-auto rounded-[20px] border border-solid border-transparent bg-zinc-100 px-2.5 py-1.5 text-sm leading-relaxed transition-[border-color] duration-150 outline-none focus:border-indigo-300 focus:bg-white dark:bg-[#3a3a3c] dark:text-zinc-200 dark:focus:border-indigo-500 dark:focus:bg-[#2e2e32]"
          aria-label="Message input"
        />
        <SubmitOnEnterPlugin onSubmit={onSubmit} />
        <SendButtonPlugin onSubmit={onSubmit} />
      </div>
    </LexicalExtensionComposer>
  );
}
