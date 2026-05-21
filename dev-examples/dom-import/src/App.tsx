/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {AutoFocusExtension} from '@lexical/extension';
import {HistoryExtension} from '@lexical/history';
import {
  $generateNodesFromDOMViaExtension,
  CoreImportExtension,
} from '@lexical/html';
import {LinkImportExtension} from '@lexical/link';
import {ListExtension, ListImportExtension} from '@lexical/list';
import {CheckListPlugin} from '@lexical/react/LexicalCheckListPlugin';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalExtensionComposer} from '@lexical/react/LexicalExtensionComposer';
import {MarkdownShortcutPlugin} from '@lexical/react/LexicalMarkdownShortcutPlugin';
import {TablePlugin} from '@lexical/react/LexicalTablePlugin';
import {RichTextExtension, RichTextImportExtension} from '@lexical/rich-text';
import {TableExtension, TableImportExtension} from '@lexical/table';
import {defineExtension, ParagraphNode, TextNode} from 'lexical';

import ExampleTheme from './ExampleTheme';
import {ImportHtmlButton} from './ImportHtmlDialog';
import {ToolbarPlugin} from './ToolbarPlugin';
import {WordPasteExtension} from './wordPaste';

const placeholder =
  'Try pasting from Word, GitHub, a webpage, or click "Import HTML"…';

const editorExtension = defineExtension({
  dependencies: [
    RichTextExtension,
    ListExtension,
    TableExtension,
    HistoryExtension,
    AutoFocusExtension,
    // DOMImportExtension pipeline — rules contributed per node package.
    CoreImportExtension,
    RichTextImportExtension,
    ListImportExtension,
    LinkImportExtension,
    TableImportExtension,
    // Word-only overlay, installed conditionally by a preprocess.
    WordPasteExtension,
  ],
  name: '@lexical/examples/dom-import',
  namespace: 'DOM Import Demo',
  nodes: [ParagraphNode, TextNode],
  onError(error: Error) {
    throw error;
  },
  theme: ExampleTheme,
});

// Expose the import helper to the dialog button without prop-drilling.
export {$generateNodesFromDOMViaExtension};

export default function App() {
  return (
    <LexicalExtensionComposer
      extension={editorExtension}
      contentEditable={null}>
      <div className="editor-container">
        <ToolbarPlugin>
          <ImportHtmlButton />
        </ToolbarPlugin>
        <div className="editor-inner">
          <ContentEditable
            className="editor-input"
            aria-placeholder={placeholder}
            placeholder={
              <div className="editor-placeholder">{placeholder}</div>
            }
          />
          <TablePlugin />
          <CheckListPlugin />
          <MarkdownShortcutPlugin />
        </div>
      </div>
    </LexicalExtensionComposer>
  );
}
