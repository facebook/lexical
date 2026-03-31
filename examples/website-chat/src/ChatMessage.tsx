/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalExtensionComposer} from '@lexical/react/LexicalExtensionComposer';
import {RichTextExtension} from '@lexical/rich-text';
import {defineExtension, EditorState, LexicalEditor} from 'lexical';
import {useMemo} from 'react';

const chatMessageTheme = {
  paragraph: 'm-0',
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
  },
};

export interface ChatMessageProps {
  initialState: EditorState | ((editor: LexicalEditor) => void);
}

export function ChatMessage({initialState}: ChatMessageProps) {
  const extension = useMemo(
    () =>
      defineExtension({
        $initialEditorState: initialState,
        dependencies: [RichTextExtension],
        editable: false,
        name: '@lexical/website/chat-message',
        namespace: '@lexical/website/chat-message',
        theme: chatMessageTheme,
      }),
    [initialState],
  );

  return (
    <LexicalExtensionComposer extension={extension} contentEditable={null}>
      <ContentEditable className="text-sm leading-[1.45] break-words outline-none" />
    </LexicalExtensionComposer>
  );
}
