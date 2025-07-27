/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import './styles.css';

import {
  AutoFocusExtension,
  buildEditorFromExtensions,
  Store,
  TabIndentationExtension,
  WritableStore,
} from '@lexical/extension';
import {HistoryExtension} from '@lexical/history';
import {
  $createListItemNode,
  $createListNode,
  CheckListExtension,
} from '@lexical/list';
import {RichTextExtension} from '@lexical/rich-text';
import {TailwindExtension} from '@lexical/tailwind';
import {mergeRegister} from '@lexical/utils';
import {
  $createTextNode,
  $getRoot,
  defineExtension,
  type EditorState,
} from 'lexical';

function $prepopulatedRichText() {
  $getRoot().append(
    $createListNode('check').append(
      $createListItemNode(true).append($createTextNode('First item is done!')),
      $createListItemNode(false).append($createTextNode('TODO')),
    ),
  );
}

const editorRef = document.getElementById('lexical-editor');
const stateRef = document.getElementById(
  'lexical-state',
) as HTMLTextAreaElement;

function stringifyEditorState(editorState: EditorState) {
  stateRef!.textContent = JSON.stringify(editorState.toJSON(), undefined, 2);
}

export const CurrentStateExtension = defineExtension<
  Record<never, never>,
  '@lexical/extension/CurrentStateExtension',
  WritableStore<EditorState>,
  unknown
>({
  build(editor) {
    return new Store(editor.getEditorState());
  },
  config: {},
  name: '@lexical/extension/CurrentStateExtension',
  register(editor, _config, state) {
    const editorState = state.getOutput();
    let prevState = editorState.get();
    return editor.registerUpdateListener((payload) => {
      if (payload.editorState !== prevState) {
        prevState = payload.editorState;
        editorState.set(prevState);
      }
    });
  },
});

buildEditorFromExtensions({
  $initialEditorState: $prepopulatedRichText,
  dependencies: [
    TailwindExtension,
    HistoryExtension,
    RichTextExtension,
    AutoFocusExtension,
    CheckListExtension,
    TabIndentationExtension,
    CurrentStateExtension,
  ],
  name: '[root]',
  namespace: '@lexical/extension-vanilla-tailwind-example',
  register(editor, _config, state) {
    editor.setRootElement(editorRef);
    return mergeRegister(
      () => editor.setRootElement(null),
      state
        .getDependency(CurrentStateExtension)
        .output.subscribe(stringifyEditorState),
    );
  },
});
