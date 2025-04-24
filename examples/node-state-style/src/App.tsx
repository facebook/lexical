/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {Tabs} from '@ark-ui/react/tabs';
import {AutoFocusPlugin} from '@lexical/react/LexicalAutoFocusPlugin';
import {
  InitialConfigType,
  LexicalComposer,
} from '@lexical/react/LexicalComposer';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {
  DOMExportOutput,
  DOMExportOutputMap,
  Klass,
  LexicalEditor,
  LexicalNode,
  ParagraphNode,
  TextNode,
} from 'lexical';
import {useEffect} from 'react';

import ExampleTheme from './ExampleTheme';
import {HTMLViewPlugin} from './plugins/HTMLViewPlugin';
import {JSONViewPlugin} from './plugins/JSONViewPlugin';
import {StyleViewPlugin} from './plugins/StyleViewPlugin';
import {ToolbarPlugin} from './plugins/ToolbarPlugin';
import {
  $exportNodeStyle,
  constructStyleImportMap,
  registerStyleState,
} from './styleState';

const placeholder = 'Enter some rich text...';

const exportMap: DOMExportOutputMap = new Map<
  Klass<LexicalNode>,
  (editor: LexicalEditor, target: LexicalNode) => DOMExportOutput
>([[TextNode, $exportNodeStyle]]);

const editorConfig: InitialConfigType = {
  html: {
    export: exportMap,
    import: constructStyleImportMap(),
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
          <StyleStatePlugin />
        </div>
      </div>
      <Tabs.Root
        lazyMount={true}
        unmountOnExit={true}
        defaultValue="style"
        style={{margin: '0 10px'}}>
        <Tabs.List
          style={{display: 'flex', justifyContent: 'center', margin: '10px 0'}}>
          <Tabs.Trigger value="style">Style Tree</Tabs.Trigger>
          <Tabs.Trigger value="html">HTML</Tabs.Trigger>
          <Tabs.Trigger value="json">JSON</Tabs.Trigger>
          <Tabs.Indicator />
        </Tabs.List>
        <Tabs.Content value="style">
          <StyleViewPlugin />
        </Tabs.Content>
        <Tabs.Content value="html">
          <HTMLViewPlugin />
        </Tabs.Content>
        <Tabs.Content value="json">
          <JSONViewPlugin />
        </Tabs.Content>
      </Tabs.Root>
    </LexicalComposer>
  );
}
