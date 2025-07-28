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
  effect,
  Signal,
  signal,
  TabIndentationExtension,
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

export const CurrentStateExtension = defineExtension<
  Record<never, never>,
  '@lexical/extension/CurrentStateExtension',
  Signal<EditorState>,
  unknown
>({
  build(editor) {
    let dispose: undefined | (() => void);
    return signal(editor.getEditorState(), {
      unwatched() {
        if (dispose) {
          dispose();
        }
      },
      watched() {
        dispose = editor.registerUpdateListener((payload) => {
          this.value = payload.editorState;
        });
      },
    });
  },
  name: '@lexical/extension/CurrentStateExtension',
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
    const editorState = state.getDependency(CurrentStateExtension).output;
    return mergeRegister(
      () => editor.setRootElement(null),
      effect(() => {
        stateRef!.textContent = JSON.stringify(
          editorState.value.toJSON(),
          undefined,
          2,
        );
      }),
    );
  },
});
