/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {AutoFocusPlugin} from '@lexical/react/LexicalAutoFocusPlugin';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  ParagraphNode,
  TextNode,
} from 'lexical';

import {MathTypeProvider} from './MathTypeContext';
import {MathTypeNode} from './MathTypeNode';
import {MathTypePlugin} from './MathTypePlugin';

const placeholder = 'Write a math note...';

const theme = {
  paragraph: 'editor-paragraph',
};

const editorConfig = {
  editorState: () => {
    $getRoot().append(
      $createParagraphNode().append(
        $createTextNode('Use the MathType toolbar to insert a formula. '),
      ),
    );
  },
  namespace: 'MathType Example',
  nodes: [ParagraphNode, TextNode, MathTypeNode],
  onError(error: Error) {
    throw error;
  },
  theme,
};

export default function App() {
  return (
    <LexicalComposer initialConfig={editorConfig}>
      <MathTypeProvider>
        <div className="editor-shell">
          <MathTypePlugin />
          <div className="editor-inner">
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  className="editor-input"
                  aria-placeholder={placeholder}
                  placeholder={
                    <div className="editor-placeholder">{placeholder}</div>
                  }
                />
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
            <HistoryPlugin />
            <AutoFocusPlugin />
          </div>
        </div>
      </MathTypeProvider>
    </LexicalComposer>
  );
}
