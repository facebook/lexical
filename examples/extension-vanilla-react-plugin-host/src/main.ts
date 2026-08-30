/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import './styles.css';

import {
  $createHorizontalRuleNode,
  AutoFocusExtension,
  buildEditorFromExtensions,
  EditorStateExtension,
  HorizontalRuleExtension,
  TabIndentationExtension,
} from '@lexical/extension';
import {HistoryExtension} from '@lexical/history';
import {
  $createListItemNode,
  $createListNode,
  CheckListExtension,
} from '@lexical/list';
import {
  mountReactExtensionComponent,
  mountReactPluginHost,
  ReactPluginHostExtension,
} from '@lexical/react/ReactPluginHostExtension';
import {TreeViewExtension} from '@lexical/react/TreeViewExtension';
import {RichTextExtension} from '@lexical/rich-text';
import {TailwindExtension} from '@lexical/tailwind';
import {mergeRegister} from '@lexical/utils';
import {$createTextNode, $getRoot} from 'lexical';

function $prepopulatedRichText() {
  $getRoot().append(
    $createListNode('check').append(
      $createListItemNode(true).append($createTextNode('First item is done!')),
      $createListItemNode(false).append($createTextNode('TODO')),
    ),
    // This is just to demo the vanilla js decorator stuff
    $createHorizontalRuleNode(),
    $createHorizontalRuleNode(),
  );
}

const editorRef = document.getElementById('lexical-editor');

buildEditorFromExtensions({
  $initialEditorState: $prepopulatedRichText,
  afterRegistration(editor, _config, _state) {
    const el = document.createElement('div');
    document.body.appendChild(el);

    mountReactPluginHost(editor, el);
    mountReactExtensionComponent(editor, {
      domNode: document.getElementById('tree-view')!,
      extension: TreeViewExtension,
      key: 'tree-view',
      props: {
        editor,
      },
    });
    editor.setRootElement(editorRef);
    return mergeRegister(() => editor.setRootElement(null));
  },
  dependencies: [
    // These don't have to be in any paritcular order, they will be
    // topologically sorted by their dependencies
    TailwindExtension,
    HistoryExtension,
    RichTextExtension,
    AutoFocusExtension,
    CheckListExtension,
    TabIndentationExtension,
    EditorStateExtension,
    HorizontalRuleExtension,
    ReactPluginHostExtension,
    TreeViewExtension,
  ],
  name: '[root]',
  namespace: '@lexical/extension-vanilla-tailwind-example',
});
