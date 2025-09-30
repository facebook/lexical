/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {AutoFocusExtension} from '@lexical/extension';
import {HistoryExtension} from '@lexical/history';
import {ExtensionComponent} from '@lexical/react/ExtensionComponent';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalExtensionComposer} from '@lexical/react/LexicalExtensionComposer';
import {TreeViewExtension} from '@lexical/react/TreeViewExtension';
import {RichTextExtension} from '@lexical/rich-text';
import {INSERT_TABLE_COMMAND, TableExtension} from '@lexical/table';
import {
  $createParagraphNode,
  $getRoot,
  defineExtension,
  LexicalEditor,
} from 'lexical';

import ExampleTheme from './ExampleTheme';
import ToolbarPlugin from './plugins/ToolbarPlugin';

const $updateEditorState = (editor: LexicalEditor) => {
  $getRoot().append($createParagraphNode()).selectEnd();
  editor.dispatchCommand(INSERT_TABLE_COMMAND, {
    columns: String(3),
    includeHeaders: true,
    rows: String(3),
  });
};

const PLACEHOLDER_TEXT = 'Enter some rich text…';
const PLACEHOLDER = (
  <div className="editor-placeholder">{PLACEHOLDER_TEXT}</div>
);

const appExtension = defineExtension({
  $initialEditorState: $updateEditorState,
  dependencies: [
    RichTextExtension,
    AutoFocusExtension,
    HistoryExtension,
    TreeViewExtension,
    TableExtension,
  ],
  name: '@lexical/examples/extension-react-table',
  namespace: '@lexical/examples/extension-react-table',
  theme: ExampleTheme,
});

export default function App() {
  return (
    <LexicalExtensionComposer extension={appExtension}>
      <div className="editor-container">
        <ToolbarPlugin />
        <div className="editor-inner">
          <ContentEditable
            className="editor-input"
            aria-placeholder={PLACEHOLDER_TEXT}
            placeholder={PLACEHOLDER}
          />
          <ExtensionComponent
            lexical:extension={TreeViewExtension}
            viewClassName="tree-view-output"
            treeTypeButtonClassName="debug-treetype-button"
            timeTravelPanelClassName="debug-timetravel-panel"
            timeTravelButtonClassName="debug-timetravel-button"
            timeTravelPanelSliderClassName="debug-timetravel-panel-slider"
            timeTravelPanelButtonClassName="debug-timetravel-panel-button"
          />
        </div>
      </div>
    </LexicalExtensionComposer>
  );
}
