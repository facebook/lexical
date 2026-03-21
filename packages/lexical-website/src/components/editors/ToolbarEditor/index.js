/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import './styles.css';

import {AutoFocusExtension} from '@lexical/extension';
import {HistoryExtension} from '@lexical/history';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalExtensionComposer} from '@lexical/react/LexicalExtensionComposer';
import {RichTextExtension} from '@lexical/rich-text';
import {defineExtension} from 'lexical';

import ToolbarPlugin from './ToolbarPlugin';

const toolbarTheme = {
  heading: {
    h1: 'editor-heading-h1',
    h2: 'editor-heading-h2',
    h3: 'editor-heading-h3',
  },
  paragraph: 'editor-paragraph',
  quote: 'editor-quote',
  text: {
    bold: 'editor-textBold',
    italic: 'editor-textItalic',
    underline: 'editor-textUnderline',
  },
};

const toolbarEditorExtension = defineExtension({
  dependencies: [RichTextExtension, AutoFocusExtension, HistoryExtension],
  name: '@lexical/website/toolbar-editor',
  namespace: '@lexical/website/toolbar-editor',
  theme: toolbarTheme,
});

export default function ToolbarEditor() {
  return (
    <LexicalExtensionComposer extension={toolbarEditorExtension}>
      <div className="toolbar-editor">
        <ToolbarPlugin />
        <div className="editor-inner">
          <ContentEditable
            className="editor-input"
            aria-placeholder="Enter some text..."
            placeholder={
              <div className="editor-placeholder">Enter some text...</div>
            }
          />
        </div>
      </div>
    </LexicalExtensionComposer>
  );
}
