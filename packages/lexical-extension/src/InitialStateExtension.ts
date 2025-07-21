/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $isEditorState,
  defineExtension,
  safeCast,
  SerializedEditorState,
} from 'lexical';
import {
  $createParagraphNode,
  $getRoot,
  type EditorSetOptions,
  type EditorUpdateOptions,
  LineBreakNode,
  ParagraphNode,
  RootNode,
  TabNode,
  TextNode,
} from 'lexical';

const HISTORY_MERGE_OPTIONS = {tag: 'history-merge'};

function $defaultInitializer() {
  const root = $getRoot();
  if (root.isEmpty()) {
    root.append($createParagraphNode());
  }
}

export interface InitialStateConfig {
  updateOptions: EditorUpdateOptions;
  setOptions: EditorSetOptions;
}

export const InitialStateExtension = defineExtension({
  afterInitialization(editor, {updateOptions, setOptions}, state) {
    const $initialEditorState = state.getInitResult();
    if ($isEditorState($initialEditorState)) {
      editor.setEditorState($initialEditorState, setOptions);
    } else if (typeof $initialEditorState === 'function') {
      editor.update(() => {
        $initialEditorState(editor);
      }, updateOptions);
    } else if (
      $initialEditorState &&
      (typeof $initialEditorState === 'string' ||
        typeof $initialEditorState === 'object')
    ) {
      const parsedEditorState = editor.parseEditorState(
        $initialEditorState as string | SerializedEditorState,
      );
      editor.setEditorState(parsedEditorState, setOptions);
    }
    return () => {
      /* noop */
    };
  },

  config: safeCast<InitialStateConfig>({
    setOptions: HISTORY_MERGE_OPTIONS,
    updateOptions: HISTORY_MERGE_OPTIONS,
  }),

  init({$initialEditorState = $defaultInitializer}) {
    return $initialEditorState;
  },

  name: '@lexical/extension/InitialState',
  // These are automatically added by createEditor, we add them here so they are
  // visible during extensionRep.init so extensions can see all known types before the
  // editor is created.
  // (excluding ArtificialNode__DO_NOT_USE because it isn't really public API
  // and shouldn't change anything)
  nodes: [RootNode, TextNode, LineBreakNode, TabNode, ParagraphNode],
});
