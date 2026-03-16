/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import './styles.css';

import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {isMacOs, isMobile, isTablet} from 'react-device-detect';

const theme = {
  paragraph: 'editor-paragraph',
  text: {
    bold: 'editor-textBold',
    italic: 'editor-textItalic',
    underline: 'editor-textUnderline',
  },
};

function onError(error) {
  console.error(error);
}

export default function ReactEditor() {
  const initialConfig = {
    namespace: 'ReactEditor',
    nodes: [HeadingNode, QuoteNode],
    onError,
    theme,
  };
  const placeholderText =
    isMobile || isTablet
      ? 'Tap to edit'
      : isMacOs
        ? '⌘ + z to undo, ⌘ + shift + z to redo, ⌘ + b for bold, ⌘ + i for italic, ⌘ + u for underline'
        : 'Ctrl + z to undo, Ctrl + y to redo, Ctrl + b for bold, Ctrl + i for italic, Ctrl + u for underline';
  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="react-editor">
        <RichTextPlugin
          ErrorBoundary={LexicalErrorBoundary}
          contentEditable={<ContentEditable className="editor-input" />}
          placeholder={
            <div className="editor-placeholder">{placeholderText}</div>
          }
        />
        <HistoryPlugin />
      </div>
    </LexicalComposer>
  );
}
