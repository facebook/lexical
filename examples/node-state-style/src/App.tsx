/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {AutoFocusPlugin} from '@lexical/react/LexicalAutoFocusPlugin';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {
  DOMExportOutput,
  DOMExportOutputMap,
  isHTMLElement,
  Klass,
  LexicalEditor,
  LexicalNode,
  ParagraphNode,
  TextNode,
} from 'lexical';
import {useEffect} from 'react';

import ExampleTheme from './ExampleTheme';
import ToolbarPlugin from './plugins/ToolbarPlugin';
import TreeViewPlugin from './plugins/TreeViewPlugin';
import {$getStyleObject, applyStyle, registerStyleState} from './styleState';

const placeholder = 'Enter some rich text...';

// TODO https://github.com/facebook/lexical/issues/7259
// there should be a better way to do this, this does not compose with other exportDOM overrides
function $exportNodeStyle(
  editor: LexicalEditor,
  target: LexicalNode,
): DOMExportOutput {
  const output = target.exportDOM(editor);
  if (output && isHTMLElement(output.element)) {
    $applyNodeStylesToElement(target, output.element);
  }
  return output;
}

function $applyNodeStylesToElement(
  node: LexicalNode,
  element: HTMLElement,
): void {
  applyStyle(element, $getStyleObject(node));
}

const exportMap: DOMExportOutputMap = new Map<
  Klass<LexicalNode>,
  (editor: LexicalEditor, target: LexicalNode) => DOMExportOutput
>([
  [ParagraphNode, $exportNodeStyle],
  [TextNode, $exportNodeStyle],
]);

const editorConfig = {
  html: {
    export: exportMap,
  },
  namespace: 'NodeState Demo',
  nodes: [ParagraphNode, TextNode],
  onError(error: Error) {
    throw error;
  },
  theme: ExampleTheme,
};

function StyleStatePlugin() {
  const [editor] = useLexicalComposerContext();
  useEffect(() => registerStyleState(editor), [editor]);
  return null;
}

export default function App() {
  return (
    <LexicalComposer initialConfig={editorConfig}>
      <div className="editor-container">
        <ToolbarPlugin />
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
          <TreeViewPlugin />
          <StyleStatePlugin />
        </div>
      </div>
    </LexicalComposer>
  );
}
