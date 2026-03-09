/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$getEditor, defineExtension, LexicalEditor, safeCast} from 'lexical';

import {LexicalBuilder} from './LexicalBuilder';

export interface NestedEditorConfig {
  $getParentEditor: () => LexicalEditor;
}

function $defaultGetParentEditor() {
  const editor = $getEditor();
  LexicalBuilder.fromEditor(editor);
  return editor;
}

export const NestedEditorExtension = defineExtension({
  config: safeCast<NestedEditorConfig>({
    $getParentEditor: $defaultGetParentEditor,
  }),
  init: (editorConfig, config, state) => {
    const parentEditor = config.$getParentEditor();
    editorConfig.parentEditor = parentEditor;
    editorConfig.theme = editorConfig.theme || parentEditor._config.theme;
  },
  name: '@lexical/extension/NestedEditor',
});
