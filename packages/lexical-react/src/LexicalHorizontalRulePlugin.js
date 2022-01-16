/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {CommandListenerEditorPriority} from 'lexical';

import {$log, $getSelection} from 'lexical';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useEffect} from 'react';
import {
  $createHorizontalRuleNode,
  HorizontalRuleNode,
} from 'lexical/HorizontalRuleNode';

const EditorPriority: CommandListenerEditorPriority = 0;

export default function HorizontalRulePlugin(): React$Node {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const removeCommandListener = editor.addListener(
      'command',
      (type) => {
        if (type === 'insertHorizontalRule') {
          $log('insertHorizontalRule');

          const selection = $getSelection();

          if (selection !== null) {
            const horizontalRuleNode = $createHorizontalRuleNode();

            const focusNode = selection.focus.getNode();

            focusNode.insertAfter(horizontalRuleNode);
          }

          return true;
        }

        return false;
      },
      EditorPriority,
    );

    const removeHorizontalRuleNode = editor.registerNodes([HorizontalRuleNode]);

    return () => {
      removeCommandListener();
      removeHorizontalRuleNode();
    };
  }, [editor]);

  return null;
}
