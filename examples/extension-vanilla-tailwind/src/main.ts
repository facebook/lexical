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
  EditorStateExtension,
  effect,
  HorizontalRuleExtension,
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
import {$createTextNode, $getRoot} from 'lexical';

import {$createHorizontalRuleNode} from '../../../packages/lexical-extension/src/HorizontalRuleExtension';

function $prepopulatedRichText() {
  $getRoot().append(
    $createListNode('check').append(
      $createListItemNode(true).append($createTextNode('First item is done!')),
      $createListItemNode(false).append($createTextNode('TODO')),
    ),
    $createHorizontalRuleNode(),
    $createHorizontalRuleNode(),
  );
}

const editorRef = document.getElementById('lexical-editor');
const stateRef = document.getElementById(
  'lexical-state',
) as HTMLTextAreaElement;

buildEditorFromExtensions({
  $initialEditorState: $prepopulatedRichText,
  dependencies: [
    TailwindExtension,
    HistoryExtension,
    RichTextExtension,
    AutoFocusExtension,
    CheckListExtension,
    TabIndentationExtension,
    EditorStateExtension,
    HorizontalRuleExtension,
  ],
  name: '[root]',
  namespace: '@lexical/extension-vanilla-tailwind-example',
  register(editor, _config, state) {
    editor.setRootElement(editorRef);
    const editorState = state.getDependency(EditorStateExtension).output;
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
