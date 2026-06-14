/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// Import the editor CSS as a raw string so it can be injected *inside* the
// shadow root (shadow trees do not inherit the document's stylesheets).
import {AutoFocusExtension, TabIndentationExtension} from '@lexical/extension';
import {HistoryExtension} from '@lexical/history';
import {LinkExtension} from '@lexical/link';
import {ListExtension} from '@lexical/list';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalExtensionComposer} from '@lexical/react/LexicalExtensionComposer';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  defineExtension,
} from 'lexical';
import {type JSX} from 'react';

import editorStyleSheet from './editor.css?raw';
import ExampleTheme from './ExampleTheme';
import ShadowRoot from './ShadowRoot';
import Toolbar from './Toolbar';

const placeholder = 'Type here — this editor lives inside a shadow root…';

function $prepopulate(): void {
  const root = $getRoot();
  if (root.getFirstChild() !== null) {
    return;
  }
  root.append(
    $createParagraphNode().append(
      $createTextNode(
        'Select some words and press Bold in the toolbar above (it lives ' +
          'in the light DOM, outside this shadow root). Try arrow keys, ' +
          'word selection (Alt/Ctrl+Shift+Arrow), and word deletion too.',
      ),
    ),
  );
}

const editorExtension = defineExtension({
  $initialEditorState: $prepopulate,
  dependencies: [
    RichTextExtension,
    ListExtension,
    LinkExtension,
    HistoryExtension,
    AutoFocusExtension,
    TabIndentationExtension,
  ],
  name: '@lexical/examples/shadow-dom',
  namespace: 'Shadow DOM Demo',
  theme: ExampleTheme,
});

export default function App(): JSX.Element {
  return (
    <LexicalExtensionComposer
      extension={editorExtension}
      contentEditable={null}>
      <div className="editor-container">
        <Toolbar />
        <ShadowRoot styleSheet={editorStyleSheet}>
          <div className="editor-inner">
            <ContentEditable
              className="editor-input"
              aria-placeholder={placeholder}
              placeholder={
                <div className="editor-placeholder">{placeholder}</div>
              }
            />
          </div>
        </ShadowRoot>
      </div>
    </LexicalExtensionComposer>
  );
}
