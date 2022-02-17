/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {CommandListenerEditorPriority} from 'lexical';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$getSelection, $log} from 'lexical';
import {useEffect} from 'react';

import {$createHorizontalRuleNode} from '../nodes/HorizontalRuleNode';

const EditorPriority: CommandListenerEditorPriority = 0;

export default function HorizontalRulePlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.addListener(
      'command',
      (type) => {
        if (type === 'insertHorizontalRule') {
          $log('insertHorizontalRule');

          const selection = $getSelection();
          if (selection === null) {
            return false;
          }

          const focusNode = selection.focus.getNode();
          if (focusNode !== null) {
            const horizontalRuleNode = $createHorizontalRuleNode();
            selection.insertParagraph();
            selection.focus
              .getNode()
              .getTopLevelElementOrThrow()
              .insertBefore(horizontalRuleNode);
          }

          return true;
        }
        return false;
      },
      EditorPriority,
    );
  }, [editor]);

  return null;
}
