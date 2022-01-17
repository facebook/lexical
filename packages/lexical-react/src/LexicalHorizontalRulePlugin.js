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
import {$createHorizontalRuleNode} from 'lexical';
import {$isAtNodeEnd} from '../../lexical-helpers/src/LexicalSelectionHelpers';
import {$createParagraphNode} from 'lexical/ParagraphNode';

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
          if (selection === null) {
            return true;
          }

          const focusNode = selection.focus.getNode();
          if (focusNode !== null) {
            const horizontalRuleNode = $createHorizontalRuleNode();
            if (
              selection.focus.getNode().getNextSibling() === null &&
              $isAtNodeEnd(selection.focus)
            ) {
              selection.focus
                .getNode()
                .getTopLevelElementOrThrow()
                .insertAfter(horizontalRuleNode);
              horizontalRuleNode.insertAfter($createParagraphNode());
            } else {
              selection.insertParagraph();
              selection.focus
                .getNode()
                .getTopLevelElementOrThrow()
                .insertBefore(horizontalRuleNode);
            }
          }

          return true;
        }
        return false;
      },
      EditorPriority,
    );

    return () => {
      removeCommandListener();
    };
  }, [editor]);

  return null;
}
