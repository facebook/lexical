/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  CodeHighlightNode,
  CodeImportExtension,
  CodeNode,
} from '@lexical/code-core';
import {CodeShikiExtension} from '@lexical/code-shiki';
import {
  AutoFocusExtension,
  configExtension,
  HorizontalRuleExtension,
  HorizontalRuleNode,
  TabIndentationExtension,
} from '@lexical/extension';
import {HistoryExtension} from '@lexical/history';
import {
  $generateNodesFromDOMViaExtension,
  CoreImportExtension,
  HorizontalRuleImportExtension,
} from '@lexical/html';
import {LinkExtension, LinkImportExtension, LinkNode} from '@lexical/link';
import {
  CheckListExtension,
  ListExtension,
  ListImportExtension,
  ListItemNode,
  ListNode,
} from '@lexical/list';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalExtensionComposer} from '@lexical/react/LexicalExtensionComposer';
import {
  HeadingNode,
  QuoteNode,
  RichTextExtension,
  RichTextImportExtension,
} from '@lexical/rich-text';
import {
  TableCellNode,
  TableExtension,
  TableImportExtension,
  TableNode,
  TableRowNode,
} from '@lexical/table';
import {defineExtension, ParagraphNode, TextNode} from 'lexical';

import ExampleTheme from './ExampleTheme';
import {ImportHtmlButton} from './ImportHtmlDialog';
import {MarkdownShortcutsExtension} from './MarkdownShortcutsExtension';
import {Toolbar, ToolbarExtension} from './ToolbarExtension';
import {WordPasteExtension} from './wordPaste';

const placeholder =
  'Try pasting from Word, GitHub, a webpage, or click "Import HTML"…';

const editorExtension = defineExtension({
  dependencies: [
    RichTextExtension,
    ListExtension,
    CheckListExtension,
    // Disable hasHorizontalScroll: the demo theme doesn't define the
    // scrollable-wrapper class, and tables here aren't wide enough to
    // need it.
    configExtension(TableExtension, {hasHorizontalScroll: false}),
    LinkExtension,
    HorizontalRuleExtension,
    HistoryExtension,
    AutoFocusExtension,
    // Tab / Shift-Tab indent at the cursor (nests/un-nests list items,
    // indents paragraphs). Pairs with ListItemNode.canIndent.
    TabIndentationExtension,
    // Registers CodeNode + CodeHighlightNode and wires Shiki up as the
    // syntax-highlighting tokenizer for code blocks in the editor.
    CodeShikiExtension,
    MarkdownShortcutsExtension,
    ToolbarExtension,
    // DOMImportExtension pipeline — rules contributed per node package.
    CoreImportExtension,
    RichTextImportExtension,
    ListImportExtension,
    LinkImportExtension,
    TableImportExtension,
    HorizontalRuleImportExtension,
    CodeImportExtension,
    // Word-only overlay, installed conditionally by a preprocess.
    WordPasteExtension,
  ],
  name: '@lexical/examples/dom-import',
  namespace: 'DOM Import Demo',
  // Markdown transformers in the default set require these nodes to
  // be present in the editor config.
  nodes: [
    ParagraphNode,
    TextNode,
    HeadingNode,
    QuoteNode,
    ListNode,
    ListItemNode,
    LinkNode,
    CodeNode,
    CodeHighlightNode,
    HorizontalRuleNode,
    TableNode,
    TableRowNode,
    TableCellNode,
  ],
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
        <Toolbar>
          <ImportHtmlButton />
        </Toolbar>
        <div className="editor-inner">
          <ContentEditable
            className="editor-input"
            aria-placeholder={placeholder}
            placeholder={
              <div className="editor-placeholder">{placeholder}</div>
            }
          />
        </div>
      </div>
    </LexicalExtensionComposer>
  );
}
